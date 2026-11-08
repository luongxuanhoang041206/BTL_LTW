using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using MovieBooking.Data;
using MovieBooking.Services;
using MovieBooking.Tests.Helpers;

namespace MovieBooking.Tests.ServiceTests;

public class ExpiredHoldCleanupServiceTests
{
    private static ServiceProvider CreateProvider(MovieBookingContext context) =>
        new ServiceCollection()
            .AddSingleton<MovieBookingContext>(context)
            .BuildServiceProvider();

    private static async Task RunOneCleanupAsync(IServiceScopeFactory scopeFactory)
    {
        var service = new ExpiredHoldCleanupService(
            scopeFactory,
            NullLogger<ExpiredHoldCleanupService>.Instance);
        var method = typeof(ExpiredHoldCleanupService).GetMethod(
            "CleanupAsync",
            BindingFlags.Instance | BindingFlags.NonPublic)
            ?? throw new MissingMethodException(typeof(ExpiredHoldCleanupService).FullName, "CleanupAsync");
        var task = method.Invoke(service, [CancellationToken.None]) as Task
            ?? throw new InvalidOperationException("CleanupAsync did not return a Task.");
        await task;
    }

    // 1. Ghế hết hạn làm booking bị hủy, payment thất bại và ghế được nhả.
    [Fact]
    public async Task CleanupAsync_ExpiredHold_CancelsBookingFailsPaymentAndReleasesSeat()
    {
        using var testDb = new SqliteTestDatabase();
        using var provider = CreateProvider(testDb.Context);
        var seed = await PaymentServiceSeedHelper.SeedAsync(testDb.Context);
        var seat = await testDb.Context.ShowtimeSeats.SingleAsync(x => x.ShowtimeSeatId == seed.ShowtimeSeatId);
        seat.HoldExpiresAt = DateTime.Now.AddDays(-1);
        await testDb.Context.SaveChangesAsync();

        await RunOneCleanupAsync(provider.GetRequiredService<IServiceScopeFactory>());

        var booking = await testDb.Context.Bookings.AsNoTracking().SingleAsync(x => x.BookingId == seed.BookingId);
        var payment = await testDb.Context.Payments.AsNoTracking().SingleAsync(x => x.PaymentId == seed.PaymentId);
        var releasedSeat = await testDb.Context.ShowtimeSeats.AsNoTracking()
            .SingleAsync(x => x.ShowtimeSeatId == seed.ShowtimeSeatId);
        Assert.Equal("Cancelled", booking.Status);
        Assert.Equal("Failed", payment.PaymentStatus);
        Assert.Equal("Available", releasedSeat.Status);
        Assert.Null(releasedSeat.HoldExpiresAt);
        Assert.Null(releasedSeat.LockedByUserId);
    }

    // 2. Ghế còn hạn giữ nguyên booking, payment và chủ ghế.
    [Fact]
    public async Task CleanupAsync_UnexpiredHold_PreservesBookingPaymentAndSeatOwner()
    {
        using var testDb = new SqliteTestDatabase();
        using var provider = CreateProvider(testDb.Context);
        var seed = await PaymentServiceSeedHelper.SeedAsync(testDb.Context);
        var seat = await testDb.Context.ShowtimeSeats.SingleAsync(x => x.ShowtimeSeatId == seed.ShowtimeSeatId);
        seat.HoldExpiresAt = DateTime.Now.AddDays(1);
        await testDb.Context.SaveChangesAsync();

        await RunOneCleanupAsync(provider.GetRequiredService<IServiceScopeFactory>());

        var booking = await testDb.Context.Bookings.AsNoTracking().SingleAsync(x => x.BookingId == seed.BookingId);
        var payment = await testDb.Context.Payments.AsNoTracking().SingleAsync(x => x.PaymentId == seed.PaymentId);
        var heldSeat = await testDb.Context.ShowtimeSeats.AsNoTracking()
            .SingleAsync(x => x.ShowtimeSeatId == seed.ShowtimeSeatId);
        Assert.Equal("Pending", booking.Status);
        Assert.Equal("Pending", payment.PaymentStatus);
        Assert.Equal("Holding", heldSeat.Status);
        Assert.Equal(seed.UserId, heldSeat.LockedByUserId);
    }

    // 3. Ghế hết hạn của booking đã Paid không bị nhả hay thay đổi.
    [Fact]
    public async Task CleanupAsync_PaidBookingWithExpiredHold_PreservesPaymentAndSeat()
    {
        using var testDb = new SqliteTestDatabase();
        using var provider = CreateProvider(testDb.Context);
        var seed = await PaymentServiceSeedHelper.SeedAsync(testDb.Context);
        var booking = await testDb.Context.Bookings.SingleAsync(x => x.BookingId == seed.BookingId);
        booking.Status = "Paid";
        var payment = await testDb.Context.Payments.SingleAsync(x => x.PaymentId == seed.PaymentId);
        payment.PaymentStatus = "Success";
        var seat = await testDb.Context.ShowtimeSeats.SingleAsync(x => x.ShowtimeSeatId == seed.ShowtimeSeatId);
        var expiredAt = DateTime.Now.AddDays(-1);
        seat.HoldExpiresAt = expiredAt;
        await testDb.Context.SaveChangesAsync();

        await RunOneCleanupAsync(provider.GetRequiredService<IServiceScopeFactory>());

        var savedBooking = await testDb.Context.Bookings.AsNoTracking().SingleAsync(x => x.BookingId == seed.BookingId);
        var savedPayment = await testDb.Context.Payments.AsNoTracking().SingleAsync(x => x.PaymentId == seed.PaymentId);
        var savedSeat = await testDb.Context.ShowtimeSeats.AsNoTracking()
            .SingleAsync(x => x.ShowtimeSeatId == seed.ShowtimeSeatId);
        Assert.Equal("Paid", savedBooking.Status);
        Assert.Equal("Success", savedPayment.PaymentStatus);
        Assert.Equal("Holding", savedSeat.Status);
        Assert.Equal(seed.UserId, savedSeat.LockedByUserId);
        Assert.Equal(expiredAt, savedSeat.HoldExpiresAt);
    }
}
