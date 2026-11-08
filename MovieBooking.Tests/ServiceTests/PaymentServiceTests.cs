using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Data.SqlClient;
using Moq;
using MovieBooking.Data;
using MovieBooking.DTOs;
using MovieBooking.Services;
using MovieBooking.Services.Interfaces;
using MovieBooking.Tests.Helpers;
using Xunit.Abstractions;

namespace MovieBooking.Tests.ServiceTests;

[Collection("SqlServer")]
public class PaymentServiceTests
{
    private readonly SqlServerFixture _fixture;
    private readonly ITestOutputHelper _output;
    private readonly Mock<IPromotionService> _promotion = new();
    private readonly Mock<ITicketEmailService> _ticketEmail = new();

    public PaymentServiceTests(SqlServerFixture fixture, ITestOutputHelper output)
    {
        _fixture = fixture;
        _output = output;
        _promotion.Setup(service => service.RedeemForBookingAsync(It.IsAny<int>()))
            .Returns(Task.CompletedTask);
        _promotion.Setup(service => service.ReleaseForBookingAsync(It.IsAny<int>()))
            .Returns(Task.CompletedTask);
        _ticketEmail.Setup(service => service.SendOnPaidAsync(It.IsAny<int>()))
            .Returns(Task.CompletedTask);
    }

    private PaymentService CreateService(
        MovieBookingContext db,
        Dictionary<string, string?>? configValues = null)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(configValues ?? new Dictionary<string, string?>())
            .Build();
        return new PaymentService(db, config, _ticketEmail.Object, _promotion.Object);
    }

    private async Task<TResult[]> RunTogetherAsync<TResult>(
        Func<MovieBookingContext, Task<TResult>> first,
        Func<MovieBookingContext, Task<TResult>> second)
    {
        var barrier = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        var arrived = 0;

        async Task<TResult> RunAsync(Func<MovieBookingContext, Task<TResult>> action)
        {
            await using var db = _fixture.CreateContext();
            if (Interlocked.Increment(ref arrived) == 2)
                barrier.SetResult(true);

            await barrier.Task.WaitAsync(TimeSpan.FromSeconds(15));
            return await action(db);
        }

        return await Task.WhenAll(RunAsync(first), RunAsync(second));
    }

    private async Task<Exception?[]> RunBankTransferTogetherAsync(SePayWebhookDto dto)
    {
        var barrier = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        var arrived = 0;

        async Task<Exception?> RunAsync()
        {
            await using var db = _fixture.CreateContext();
            var service = CreateService(db);
            if (Interlocked.Increment(ref arrived) == 2)
                barrier.SetResult(true);

            await barrier.Task.WaitAsync(TimeSpan.FromSeconds(15));
            try
            {
                await service.ProcessBankTransferAsync(dto);
                return null;
            }
            catch (Exception exception)
            {
                _output.WriteLine("Concurrent ProcessBankTransferAsync exception: {0}", exception);
                return exception;
            }
        }

        return await Task.WhenAll(RunAsync(), RunAsync());
    }

    private static SePayWebhookDto CreateTransfer(PaymentServiceSeed seed, decimal? amount = null) => new()
    {
        Id = seed.ProviderTransactionId,
        Code = $"MBPAY{seed.PaymentId}",
        TransferType = "in",
        TransferAmount = amount ?? 25m,
        ReferenceCode = $"SEPAY-{seed.ProviderTransactionId}",
        Content = $"MBPAY{seed.PaymentId}"
    };

    // 1. Callback thành công cập nhật payment, booking và ghế đúng trạng thái.
    [Fact]
    public async Task ConfirmPaymentResultAsync_ValidCallback_UpdatesPaymentBookingAndSeat()
    {
        await _fixture.ResetAsync();
        await using (var db = _fixture.CreateContext())
        {
            var seed = await PaymentServiceSeedHelper.SeedAsync(db);
            var result = await CreateService(db).ConfirmPaymentResultAsync(
                seed.PaymentId, seed.TransactionCode, true);

            Assert.True(result.Success);
            Assert.Null(result.Error);
        }

        await using var verifyDb = _fixture.CreateContext();
        var payment = await verifyDb.Payments.AsNoTracking().SingleAsync();
        var booking = await verifyDb.Bookings.AsNoTracking().SingleAsync();
        var seat = await verifyDb.ShowtimeSeats.AsNoTracking().SingleAsync();
        Assert.Equal("Success", payment.PaymentStatus);
        Assert.NotNull(payment.PaidAt);
        Assert.Equal("Paid", booking.Status);
        Assert.False(string.IsNullOrWhiteSpace(booking.TicketCode));
        Assert.Equal("Booked", seat.Status);
        Assert.Null(seat.HoldExpiresAt);
        Assert.Null(seat.LockedByUserId);
    }

    // 2. Callback lặp lại trả thành công idempotent mà không đổi lại dữ liệu đã xử lý.
    [Fact]
    public async Task ConfirmPaymentResultAsync_RepeatedCallback_IsIdempotent()
    {
        await _fixture.ResetAsync();
        int paymentId;
        string transactionCode;
        string? ticketCode;
        DateTime? paidAt;

        await using (var db = _fixture.CreateContext())
        {
            var seed = await PaymentServiceSeedHelper.SeedAsync(db);
            paymentId = seed.PaymentId;
            transactionCode = seed.TransactionCode;
            var service = CreateService(db);
            Assert.True((await service.ConfirmPaymentResultAsync(paymentId, transactionCode, true)).Success);
            ticketCode = await db.Bookings.Where(x => x.BookingId == seed.BookingId)
                .Select(x => x.TicketCode).SingleAsync();
            paidAt = await db.Payments.Where(x => x.PaymentId == paymentId)
                .Select(x => x.PaidAt).SingleAsync();

            var repeated = await service.ConfirmPaymentResultAsync(paymentId, transactionCode, true);
            Assert.True(repeated.Success);
            Assert.Null(repeated.Error);
        }

        await using var verifyDb = _fixture.CreateContext();
        Assert.Equal(ticketCode, await verifyDb.Bookings.AsNoTracking()
            .Select(x => x.TicketCode).SingleAsync());
        Assert.Equal(paidAt, await verifyDb.Payments.AsNoTracking()
            .Select(x => x.PaidAt).SingleAsync());
        Assert.Equal("Booked", await verifyDb.ShowtimeSeats.AsNoTracking()
            .Select(x => x.Status).SingleAsync());
    }

    // 3. Callback đồng thời chỉ tạo một lần chuyển trạng thái và để lại trạng thái cuối hợp lệ.
    [Fact]
    public async Task ConfirmPaymentResultAsync_ConcurrentCallbacks_ApplyTransitionOnce()
    {
        await _fixture.ResetAsync();
        int paymentId;
        int bookingId;
        string transactionCode;
        await using (var seedDb = _fixture.CreateContext())
        {
            var seed = await PaymentServiceSeedHelper.SeedAsync(seedDb);
            paymentId = seed.PaymentId;
            bookingId = seed.BookingId;
            transactionCode = seed.TransactionCode;
        }

        await RunTogetherAsync(
            db => CreateService(db).ConfirmPaymentResultAsync(paymentId, transactionCode, true),
            db => CreateService(db).ConfirmPaymentResultAsync(paymentId, transactionCode, true));

        await using var verifyDb = _fixture.CreateContext();
        var payment = await verifyDb.Payments.AsNoTracking().SingleAsync(x => x.PaymentId == paymentId);
        var booking = await verifyDb.Bookings.AsNoTracking().SingleAsync(x => x.BookingId == bookingId);
        var seat = await verifyDb.ShowtimeSeats.AsNoTracking().SingleAsync();
        Assert.Equal("Success", payment.PaymentStatus);
        Assert.NotNull(payment.PaidAt);
        Assert.Equal("Paid", booking.Status);
        Assert.False(string.IsNullOrWhiteSpace(booking.TicketCode));
        Assert.Equal("Booked", seat.Status);
        Assert.Null(seat.HoldExpiresAt);
        Assert.Null(seat.LockedByUserId);
    }

    // 4. Điều kiện giữ ghế không hợp lệ chuyển payment sang PaidNeedRefund mà không đổi booking hoặc ghế.
    [Fact]
    public async Task ConfirmPaymentResultAsync_ExpiredSeat_RequiresRefundWithoutChangingBookingOrSeat()
    {
        await _fixture.ResetAsync();
        int paymentId;
        int bookingId;
        int userId;
        string transactionCode;
        int seatId;
        await using (var db = _fixture.CreateContext())
        {
            var seed = await PaymentServiceSeedHelper.SeedAsync(db);
            paymentId = seed.PaymentId;
            bookingId = seed.BookingId;
            userId = seed.UserId;
            transactionCode = seed.TransactionCode;
            seatId = seed.ShowtimeSeatId;
            var showtimeSeat = await db.ShowtimeSeats.SingleAsync(x => x.ShowtimeSeatId == seatId);
            showtimeSeat.HoldExpiresAt = DateTime.Now.AddMinutes(-5);
            await db.SaveChangesAsync();

            var result = await CreateService(db).ConfirmPaymentResultAsync(paymentId, transactionCode, true);
            Assert.False(result.Success);
            Assert.Equal("Thanh toán đã được nhận nhưng ghế không còn được giữ; cần xử lý hoàn tiền.", result.Error);
        }

        await using var verifyDb = _fixture.CreateContext();
        Assert.Equal("PaidNeedRefund", (await verifyDb.Payments.AsNoTracking()
            .SingleAsync(x => x.PaymentId == paymentId)).PaymentStatus);
        Assert.Equal("Pending", (await verifyDb.Bookings.AsNoTracking()
            .SingleAsync(x => x.BookingId == bookingId)).Status);
        var verifiedSeat = await verifyDb.ShowtimeSeats.AsNoTracking().SingleAsync(x => x.ShowtimeSeatId == seatId);
        Assert.Equal("Holding", verifiedSeat.Status);
        Assert.NotNull(verifiedSeat.HoldExpiresAt);
        Assert.Equal(userId, verifiedSeat.LockedByUserId);
    }

    // 5. Webhook hợp lệ cập nhật payment, booking, ghế và phát hành vé.
    [Fact]
    public async Task ProcessBankTransferAsync_ValidTransfer_ProcessesPaymentAndBooking()
    {
        await _fixture.ResetAsync();
        int paymentId;
        int bookingId;
        int bookingDetailId;
        string referenceCode;
        await using (var db = _fixture.CreateContext())
        {
            var seed = await PaymentServiceSeedHelper.SeedAsync(db);
            paymentId = seed.PaymentId;
            bookingId = seed.BookingId;
            bookingDetailId = seed.BookingDetailId;
            var transfer = CreateTransfer(seed);
            referenceCode = transfer.ReferenceCode!;
            await CreateService(db).ProcessBankTransferAsync(transfer);
        }

        await using var verifyDb = _fixture.CreateContext();
        var payment = await verifyDb.Payments.AsNoTracking().SingleAsync(x => x.PaymentId == paymentId);
        var booking = await verifyDb.Bookings.AsNoTracking().SingleAsync(x => x.BookingId == bookingId);
        var seat = await verifyDb.ShowtimeSeats.AsNoTracking().SingleAsync();
        var bankTransaction = await verifyDb.BankTransactions.AsNoTracking().SingleAsync();
        Assert.Equal("Success", payment.PaymentStatus);
        Assert.Equal(referenceCode, payment.TransactionCode);
        Assert.NotNull(payment.PaidAt);
        Assert.Equal("Paid", booking.Status);
        Assert.False(string.IsNullOrWhiteSpace(booking.TicketCode));
        Assert.Equal("Booked", seat.Status);
        Assert.Null(seat.HoldExpiresAt);
        Assert.Equal("Success", bankTransaction.Result);
        Assert.Equal(paymentId, bankTransaction.PaymentId);
        Assert.Single(await verifyDb.Tickets.AsNoTracking()
            .Where(x => x.BookingDetailId == bookingDetailId).ToListAsync());
    }

    // 6. Callback lặp lại cùng transfer ID không tạo log hay vé trùng.
    [Fact]
    public async Task ProcessBankTransferAsync_RepeatedTransfer_DoesNotProcessTwice()
    {
        await _fixture.ResetAsync();
        int paymentId;
        int bookingDetailId;
        long providerTransactionId;
        await using (var db = _fixture.CreateContext())
        {
            var seed = await PaymentServiceSeedHelper.SeedAsync(db);
            paymentId = seed.PaymentId;
            bookingDetailId = seed.BookingDetailId;
            providerTransactionId = seed.ProviderTransactionId;
            var service = CreateService(db);
            var transfer = CreateTransfer(seed);
            await service.ProcessBankTransferAsync(transfer);
            await service.ProcessBankTransferAsync(transfer);
        }

        await using var verifyDb = _fixture.CreateContext();
        Assert.Equal(1, await verifyDb.BankTransactions.AsNoTracking()
            .CountAsync(x => x.ProviderTransactionId == providerTransactionId));
        Assert.Equal("Success", (await verifyDb.Payments.AsNoTracking()
            .SingleAsync(x => x.PaymentId == paymentId)).PaymentStatus);
        Assert.Single(await verifyDb.Tickets.AsNoTracking()
            .Where(x => x.BookingDetailId == bookingDetailId).ToListAsync());
    }

    // 7. Webhook đồng thời cùng ID chỉ tạo một log; exception cạnh tranh được ghi ra output.
    [Fact]
    public async Task ProcessBankTransferAsync_ConcurrentDuplicate_LeavesSingleProcessedTransaction()
    {
        await _fixture.ResetAsync();
        PaymentServiceSeed seed;
        await using (var seedDb = _fixture.CreateContext())
            seed = await PaymentServiceSeedHelper.SeedAsync(seedDb);

        var outcomes = await RunBankTransferTogetherAsync(CreateTransfer(seed));
        var exceptions = outcomes.Where(exception => exception != null).ToList();
        Assert.Contains(outcomes, exception => exception == null);
        Assert.All(exceptions, exception => Assert.True(
            exception is DbUpdateException or SqlException { Number: 1205 },
            exception!.ToString()));

        await using var verifyDb = _fixture.CreateContext();
        var payment = await verifyDb.Payments.AsNoTracking().SingleAsync(x => x.PaymentId == seed.PaymentId);
        var booking = await verifyDb.Bookings.AsNoTracking().SingleAsync(x => x.BookingId == seed.BookingId);
        var seat = await verifyDb.ShowtimeSeats.AsNoTracking().SingleAsync();
        Assert.Equal(1, await verifyDb.BankTransactions.AsNoTracking()
            .CountAsync(x => x.ProviderTransactionId == seed.ProviderTransactionId));
        Assert.Equal("Success", payment.PaymentStatus);
        Assert.Equal("Paid", booking.Status);
        Assert.Equal("Booked", seat.Status);
        Assert.Single(await verifyDb.Tickets.AsNoTracking()
            .Where(x => x.BookingDetailId == seed.BookingDetailId).ToListAsync());
    }

    // 8. Số tiền chuyển không khớp chỉ ghi log, không đổi payment, booking hoặc ghế.
    [Fact]
    public async Task ProcessBankTransferAsync_AmountMismatch_LeavesBookingAndSeatUnchanged()
    {
        await _fixture.ResetAsync();
        PaymentServiceSeed seed;
        await using (var db = _fixture.CreateContext())
        {
            seed = await PaymentServiceSeedHelper.SeedAsync(db);
            await CreateService(db).ProcessBankTransferAsync(CreateTransfer(seed, 26m));
        }

        await using var verifyDb = _fixture.CreateContext();
        Assert.Equal("Pending", (await verifyDb.Payments.AsNoTracking()
            .SingleAsync(x => x.PaymentId == seed.PaymentId)).PaymentStatus);
        Assert.Equal("Pending", (await verifyDb.Bookings.AsNoTracking()
            .SingleAsync(x => x.BookingId == seed.BookingId)).Status);
        Assert.Equal("Holding", (await verifyDb.ShowtimeSeats.AsNoTracking()
            .SingleAsync(x => x.ShowtimeSeatId == seed.ShowtimeSeatId)).Status);
        Assert.Equal("AmountMismatch", (await verifyDb.BankTransactions.AsNoTracking().SingleAsync()).Result);
    }

    // 9. Ghế đã mất thì payment chuyển PaidNeedRefund, không xác nhận booking hay ghế.
    [Fact]
    public async Task ProcessBankTransferAsync_SeatLost_RequiresRefundWithoutBookingOrSeatUpdate()
    {
        await _fixture.ResetAsync();
        PaymentServiceSeed seed;
        await using (var db = _fixture.CreateContext())
        {
            seed = await PaymentServiceSeedHelper.SeedAsync(db);
            var seat = await db.ShowtimeSeats.SingleAsync(x => x.ShowtimeSeatId == seed.ShowtimeSeatId);
            seat.Status = "Available";
            seat.HoldExpiresAt = null;
            seat.LockedByUserId = null;
            await db.SaveChangesAsync();
            await CreateService(db).ProcessBankTransferAsync(CreateTransfer(seed));
        }

        await using var verifyDb = _fixture.CreateContext();
        Assert.Equal("PaidNeedRefund", (await verifyDb.Payments.AsNoTracking()
            .SingleAsync(x => x.PaymentId == seed.PaymentId)).PaymentStatus);
        Assert.Equal("Pending", (await verifyDb.Bookings.AsNoTracking()
            .SingleAsync(x => x.BookingId == seed.BookingId)).Status);
        var seatAfter = await verifyDb.ShowtimeSeats.AsNoTracking()
            .SingleAsync(x => x.ShowtimeSeatId == seed.ShowtimeSeatId);
        Assert.Equal("Available", seatAfter.Status);
        Assert.Null(seatAfter.HoldExpiresAt);
        Assert.Equal("PaidButSeatLost", (await verifyDb.BankTransactions.AsNoTracking().SingleAsync()).Result);
    }

    // 10. Khởi tạo thanh toán mới tạo payment Pending và trả URL cổng giả lập.
    [Fact]
    public async Task InitializePaymentAsync_NoPendingPayment_CreatesPaymentAndUrl()
    {
        await _fixture.ResetAsync();
        PaymentServiceSeed seed;
        await using (var db = _fixture.CreateContext())
        {
            seed = await PaymentServiceSeedHelper.SeedAsync(db);
            db.Payments.Remove(await db.Payments.SingleAsync(x => x.PaymentId == seed.PaymentId));
            await db.SaveChangesAsync();

            var result = await CreateService(db).InitializePaymentAsync(
                seed.BookingId, seed.UserId, "VnPay", "127.0.0.1");

            Assert.True(result.Success);
            Assert.NotNull(result.PaymentId);
            Assert.Contains($"paymentId={result.PaymentId}", result.PaymentUrl);
            Assert.Contains("success=true", result.PaymentUrl);
        }

        await using var verifyDb = _fixture.CreateContext();
        var payment = await verifyDb.Payments.AsNoTracking().SingleAsync();
        Assert.Equal("Pending", payment.PaymentStatus);
        Assert.Equal("VnPay", payment.Method);
        Assert.StartsWith("VNP", payment.TransactionCode);
        Assert.Equal(seed.BookingId, payment.BookingId);
        Assert.Equal("Pending", (await verifyDb.Bookings.AsNoTracking()
            .SingleAsync(x => x.BookingId == seed.BookingId)).Status);
    }

    // 11. Khởi tạo lại dùng lại payment Pending thay vì tạo thêm bản ghi.
    [Fact]
    public async Task InitializePaymentAsync_ExistingPendingPayment_ReusesPayment()
    {
        await _fixture.ResetAsync();
        PaymentServiceSeed seed;
        (bool Success, int? PaymentId, string? PaymentUrl, string? Error) result;
        await using (var db = _fixture.CreateContext())
        {
            seed = await PaymentServiceSeedHelper.SeedAsync(db);
            result = await CreateService(db).InitializePaymentAsync(
                seed.BookingId, seed.UserId, "MoMo", "127.0.0.1");
        }

        Assert.True(result.Success);
        Assert.Equal(seed.PaymentId, result.PaymentId);
        await using var verifyDb = _fixture.CreateContext();
        var payment = await verifyDb.Payments.AsNoTracking().SingleAsync();
        Assert.Equal(seed.PaymentId, payment.PaymentId);
        Assert.Equal("Pending", payment.PaymentStatus);
        Assert.Equal("MoMo", payment.Method);
        Assert.StartsWith("MM", payment.TransactionCode);
    }

    // 12. Tạo QR SePay tạo payment mới và gia hạn giữ ghế 15 phút.
    [Fact]
    public async Task CreateBankPaymentAsync_NoSePayPayment_CreatesPaymentAndQrInfo()
    {
        await _fixture.ResetAsync();
        PaymentServiceSeed seed;
        var configValues = new Dictionary<string, string?>
        {
            ["SePay:BankCode"] = "VCB",
            ["SePay:AccountNumber"] = "0123456789",
            ["SePay:AccountName"] = "TEST CUSTOMER"
        };
        (bool Success, BankPaymentInfo? Info, string? Error) result;
        var before = DateTime.Now;
        await using (var db = _fixture.CreateContext())
        {
            seed = await PaymentServiceSeedHelper.SeedAsync(db);
            db.Payments.Remove(await db.Payments.SingleAsync(x => x.PaymentId == seed.PaymentId));
            await db.SaveChangesAsync();
            result = await CreateService(db, configValues)
                .CreateBankPaymentAsync(seed.BookingId, seed.UserId);
        }

        Assert.True(result.Success);
        Assert.NotNull(result.Info);
        Assert.Equal("VCB", result.Info.BankCode);
        Assert.Equal("0123456789", result.Info.AccountNumber);
        Assert.Equal("TEST CUSTOMER", result.Info.AccountName);
        Assert.Equal($"MBPAY{result.Info.PaymentId}", result.Info.Content);
        Assert.Contains("VCB-0123456789-compact2.png", result.Info.QrUrl);
        Assert.Contains("accountName=TEST%20CUSTOMER", result.Info.QrUrl);

        await using var verifyDb = _fixture.CreateContext();
        var payment = await verifyDb.Payments.AsNoTracking().SingleAsync();
        var seat = await verifyDb.ShowtimeSeats.AsNoTracking()
            .SingleAsync(x => x.ShowtimeSeatId == seed.ShowtimeSeatId);
        Assert.Equal("SePay", payment.Method);
        Assert.Equal("Pending", payment.PaymentStatus);
        Assert.Equal(seed.BookingId, payment.BookingId);
        Assert.True(seat.HoldExpiresAt > before.AddMinutes(14));
        Assert.True(seat.HoldExpiresAt <= before.AddMinutes(16));
    }

    // `13. Tạo QR SePay lần nữa tái sử dụng payment đang chờ.
    [Fact]
    public async Task CreateBankPaymentAsync_ExistingPendingSePayPayment_ReusesPayment()
    {
        await _fixture.ResetAsync();
        PaymentServiceSeed seed;
        (bool Success, BankPaymentInfo? Info, string? Error) result;
        var configValues = new Dictionary<string, string?>
        {
            ["SePay:BankCode"] = "VCB",
            ["SePay:AccountNumber"] = "0123456789",
            ["SePay:AccountName"] = "TEST CUSTOMER"
        };
        var before = DateTime.Now;
        await using (var db = _fixture.CreateContext())
        {
            seed = await PaymentServiceSeedHelper.SeedAsync(db);
            var pendingPayment = await db.Payments.SingleAsync(x => x.PaymentId == seed.PaymentId);
            pendingPayment.Method = "SePay";
            await db.SaveChangesAsync();
            result = await CreateService(db, configValues)
                .CreateBankPaymentAsync(seed.BookingId, seed.UserId);
        }

        Assert.True(result.Success);
        Assert.NotNull(result.Info);
        Assert.Equal(seed.PaymentId, result.Info.PaymentId);
        Assert.Equal($"MBPAY{seed.PaymentId}", result.Info.Content);
        await using var verifyDb = _fixture.CreateContext();
        var payment = await verifyDb.Payments.AsNoTracking().SingleAsync();
        var seat = await verifyDb.ShowtimeSeats.AsNoTracking()
            .SingleAsync(x => x.ShowtimeSeatId == seed.ShowtimeSeatId);
        Assert.Equal(seed.PaymentId, payment.PaymentId);
        Assert.Equal("SePay", payment.Method);
        Assert.Equal("Pending", payment.PaymentStatus);
        Assert.True(seat.HoldExpiresAt > before.AddMinutes(14));
        Assert.True(seat.HoldExpiresAt <= before.AddMinutes(16));
    }
}
