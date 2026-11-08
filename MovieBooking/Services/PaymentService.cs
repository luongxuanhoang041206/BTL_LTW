using System;
using System.Data;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.DTOs;
using MovieBooking.Models;
using MovieBooking.Services.Interfaces;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;
using System.Security.Cryptography;

namespace MovieBooking.Services;

public class PaymentService : IPaymentService
{
    private readonly MovieBookingContext _context;
    private readonly IConfiguration _config;
    private readonly ITicketEmailService _ticketEmail;

    private readonly IPromotionService _promotionService;

    public PaymentService(
        MovieBookingContext context,
        IConfiguration config,
        ITicketEmailService ticketEmail,
        IPromotionService promotionService)
    {
        _context = context;
        _config = config;
        _ticketEmail = ticketEmail;
        _promotionService = promotionService;
    }

    public async Task<List<AdminPaymentDto>> GetAdminPaymentsAsync(string? status, string? method)
    {
        var query = _context.Payments
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(payment => payment.PaymentStatus == status);
        if (!string.IsNullOrWhiteSpace(method))
            query = query.Where(payment => payment.Method == method);

        return await query
            .OrderByDescending(payment => payment.PaymentId)
            .Take(100)
            .Select(payment => new AdminPaymentDto(
                payment.PaymentId,
                payment.BookingId,
                "MB-" + payment.BookingId.ToString("D6"),
                payment.Booking.User.FullName,
                payment.Booking.User.Email,
                payment.Booking.Showtime.Movie.Title,
                payment.Amount,
                payment.Method,
                payment.TransactionCode ?? "---",
                payment.PaymentStatus,
                payment.PaidAt.HasValue ? payment.PaidAt.Value.ToString("yyyy-MM-dd HH:mm") : null))
            .ToListAsync();
    }

    public async Task<bool> VerifyAdminPaymentAsync(int paymentId)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var payment = await _context.Payments
            .Include(item => item.Booking)
                .ThenInclude(booking => booking.Showtime)
            .FirstOrDefaultAsync(item => item.PaymentId == paymentId);
        if (payment?.Booking == null || payment.PaymentStatus != "Pending" || payment.Booking.Status != "Pending" ||
            payment.Booking.Showtime.Status != "Active")
            return false;

        var seats = await _context.BookingDetails
            .Where(detail => detail.BookingId == payment.BookingId)
            .Select(detail => detail.ShowtimeSeat)
            .ToListAsync();
        if (seats.Count == 0 || seats.Any(seat => seat.Status != "Holding" ||
                seat.LockedByUserId != payment.Booking.UserId || seat.HoldExpiresAt == null ||
                seat.HoldExpiresAt < DateTime.Now))
            return false;

        payment.PaymentStatus = "Success";
        payment.PaidAt = DateTime.Now;
        payment.Booking.Status = "Paid";
        foreach (var seat in seats)
        {
            seat.Status = "Booked";
            seat.HoldExpiresAt = null;
            seat.LockedByUserId = null;
        }

        await _promotionService.RedeemForBookingAsync(payment.BookingId);
        await _context.SaveChangesAsync();
        await IssueTicketsForBookingAsync(payment.BookingId);
        await transaction.CommitAsync();
        return true;
    }

    public async Task<(bool Found, string? Status, int? BookingId)> GetPaymentStatusAsync(int paymentId, int userId)
    {
        var payment = await _context.Payments
            .Where(p => p.PaymentId == paymentId && p.Booking.UserId == userId)
            .Select(p => new { p.PaymentStatus, p.BookingId })
            .FirstOrDefaultAsync();

        return payment == null
            ? (false, null, null)
            : (true, payment.PaymentStatus, payment.BookingId);
    }

    public async Task<decimal?> GetPaymentAmountAsync(int paymentId, int userId)
    {
        return await _context.Payments
            .Where(p => p.PaymentId == paymentId && p.Booking.UserId == userId)
            .Select(p => (decimal?)p.Amount)
            .FirstOrDefaultAsync();
    }

    public async Task<(bool Success, int? PaymentId, string? Error)> ProcessPaymentAsync(
        int bookingId,
        int userId,
        string method,
        bool simulateFailure = false)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var booking = await _context.Bookings
            .FirstOrDefaultAsync(b => b.BookingId == bookingId && b.UserId == userId);

        if (booking == null)
            return (false, null, "Booking không tồn tại.");

        if (booking.Status != "Pending")
            return (false, null, "Booking này không ở trạng thái chờ thanh toán.");
        if (await _context.Payments.AnyAsync(p => p.BookingId == bookingId && p.PaymentStatus == "Success"))
            return (false, null, "Booking đã được thanh toán.");
        if (!await _context.Showtimes.AnyAsync(s => s.ShowtimeId == booking.ShowtimeId && s.Status == "Active"))
            return (false, null, "Suất chiếu đã ngừng nhận thanh toán.");

        var seats = await _context.BookingDetails
            .Where(detail => detail.BookingId == bookingId)
            .Select(detail => detail.ShowtimeSeat)
            .ToListAsync();
        if (!simulateFailure && (seats.Count == 0 || seats.Any(seat => seat.Status != "Holding" ||
                seat.LockedByUserId != userId || seat.HoldExpiresAt == null || seat.HoldExpiresAt < DateTime.Now)))
            return (false, null, "Ghế đã hết thời gian giữ, vui lòng đặt lại.");

        var payment = new Payment
        {
            BookingId = bookingId,
            Amount = booking.TotalAmount,
            Method = method,
            TransactionCode = GenerateTransactionCode(method),
            PaymentStatus = "Pending",
            PaidAt = null
        };
        _context.Payments.Add(payment);
        await _context.SaveChangesAsync();

        if (simulateFailure)
        {
            payment.PaymentStatus = "Failed";
            await _promotionService.ReleaseForBookingAsync(bookingId);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return (false, payment.PaymentId, "Thanh toán thất bại (giả lập). Vui lòng thử lại.");
        }

        payment.PaymentStatus = "Success";
        payment.PaidAt = DateTime.Now;
        booking.Status = "Paid";

        foreach (var seat in seats)
        {
            seat.Status = "Booked";
            seat.HoldExpiresAt = null;
            seat.LockedByUserId = null;
        }

        try
        {
            await _promotionService.RedeemForBookingAsync(bookingId);
            await _context.SaveChangesAsync();
            await IssueTicketsForBookingAsync(bookingId);
            await transaction.CommitAsync();
            return (true, payment.PaymentId, null);
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync();
            return (false, null, "Booking đã được thanh toán. Vui lòng kiểm tra lại đơn.");
        }
    }

    private static string GenerateTransactionCode(string method)
    {
        var prefix = method.ToUpper() switch
        {
            "VNPAY" => "VNP",
            "MOMO" => "MM",
            _ => "TXN"
        };
        return $"{prefix}{DateTime.Now:yyyyMMddHHmmss}{new Random().Next(1000, 9999)}";
    }

    private static string GenerateTicketCode(int bookingId)
    {
        var rnd = Convert.ToHexString(RandomNumberGenerator.GetBytes(3));
        return $"MB{bookingId:D6}-{rnd}";
    }

    // -----------------------------------------------------------------------
    // TICKET ISSUANCE
    // -----------------------------------------------------------------------

    /// <summary>
    /// Phát hành vé điện tử cho TỪNG BookingDetail khi booking đã thực sự thanh toán thành công.
    /// Chỉ phát hành khi đồng thời: Booking.Status = "Paid", có Payment.Status = "Success",
    /// và booking có ít nhất một BookingDetail. Không phát hành cho Pending/Cancelled/Failed/PaidNeedRefund.
    /// Idempotent: chỉ tạo Ticket cho BookingDetail chưa có vé, bảo đảm callback lặp lại không tạo trùng.
    /// Hàm được gọi trong transaction của luồng thanh toán, trước khi commit.
    /// </summary>
    private async Task IssueTicketsForBookingAsync(int bookingId)
    {
        var booking = await _context.Bookings
            .Include(b => b.BookingDetails)
            .FirstOrDefaultAsync(b => b.BookingId == bookingId);

        // Chỉ phát hành khi booking thực sự đã thanh toán và có ít nhất một ghế.
        if (booking == null || booking.Status != "Paid" || booking.BookingDetails.Count == 0)
            return;

        // Bắt buộc phải có một giao dịch Success (loại trừ PaidNeedRefund / Failed).
        var hasSuccessPayment = await _context.Payments
            .AnyAsync(p => p.BookingId == bookingId && p.PaymentStatus == "Success");
        if (!hasSuccessPayment)
            return;

        var detailIds = booking.BookingDetails.Select(d => d.BookingDetailId).ToList();
        var existingDetailIds = await _context.Tickets
            .Where(t => detailIds.Contains(t.BookingDetailId))
            .Select(t => t.BookingDetailId)
            .ToListAsync();

        var missingDetails = booking.BookingDetails
            .Where(d => !existingDetailIds.Contains(d.BookingDetailId))
            .ToList();
        if (missingDetails.Count == 0)
            return;

        var now = DateTime.Now;
        foreach (var detail in missingDetails)
        {
            _context.Tickets.Add(new Ticket
            {
                BookingDetailId = detail.BookingDetailId,
                TicketCode = GenerateTicketCodeForSeat(bookingId, detail.BookingDetailId),
                Qrtoken = GenerateQrToken(),
                Status = "Issued",
                IssuedAt = now
            });
        }

        await _context.SaveChangesAsync();
    }

    /// <summary>Mã vé riêng cho từng ghế (khác Bookings.TicketCode), không tái sử dụng.</summary>
    private static string GenerateTicketCodeForSeat(int bookingId, int bookingDetailId)
    {
        var rnd = Convert.ToHexString(RandomNumberGenerator.GetBytes(3));
        return $"TK-{bookingId:D6}-{bookingDetailId:D4}-{rnd}";
    }

    /// <summary>
    /// Sinh QRToken bằng cryptographically secure RNG (32 byte = 64 ký tự hex).
    /// Không chứa BookingId / UserId / thông tin cá nhân. Không lưu ảnh QR vào DB.
    /// </summary>
    private static string GenerateQrToken()
    {
        return Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    }

    public async Task<(bool Success, int? PaymentId, string? PaymentUrl, string? Error)> InitializePaymentAsync(
        int bookingId,
        int userId,
        string method,
        string ipAddress)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var booking = await _context.Bookings
            .FirstOrDefaultAsync(b => b.BookingId == bookingId && b.UserId == userId);

            if (booking == null)
                return (false, null, null, "Booking không tồn tại.");
            if (booking.Status != "Pending")
                return (false, null, null, "Booking này không ở trạng thái chờ thanh toán.");
            if (!await _context.Showtimes.AnyAsync(s => s.ShowtimeId == booking.ShowtimeId && s.Status == "Active"))
                return (false, null, null, "Suất chiếu đã ngừng nhận thanh toán.");

            var seats = await _context.BookingDetails
                .Where(detail => detail.BookingId == bookingId)
                .Select(detail => detail.ShowtimeSeat)
                .ToListAsync();
            var now = DateTime.Now;
            if (seats.Count == 0 || seats.Any(seat => seat.Status != "Holding" ||
                    seat.LockedByUserId != userId || seat.HoldExpiresAt == null || seat.HoldExpiresAt < now))
                return (false, null, null, "Ghế đã hết thời gian giữ, vui lòng đặt lại.");

            var existingPayment = await _context.Payments
                    .FirstOrDefaultAsync(p => p.BookingId == bookingId && p.PaymentStatus == "Pending");

            Payment payment;
            if (existingPayment != null)
            {
                payment = existingPayment;
                payment.Method = method;
                payment.TransactionCode = GenerateTransactionCode(method);
            }
            else
            {
                payment = new Payment
                {
                    BookingId = bookingId,
                    Amount = booking.TotalAmount,
                    Method = method,
                    TransactionCode = GenerateTransactionCode(method),
                    PaymentStatus = "Pending",
                    PaidAt = null
                };
                _context.Payments.Add(payment);
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            await _ticketEmail.SendOnPaidAsync(payment.BookingId);

            // Mô phỏng URL chuyển hướng thanh toán (hoặc URL tích hợp cổng thanh toán thực tế)
            string mockGatewayUrl = $"/Payment/ReturnResult?paymentId={payment.PaymentId}&transactionCode={payment.TransactionCode}&success=true";

            return (true, payment.PaymentId, mockGatewayUrl, null);
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            return (false, null, null, "Đã xảy ra lỗi hệ thống khi khởi tạo thanh toán.");
        }
    }

    public async Task<(bool Success, string? Error)> ConfirmPaymentResultAsync(
        int paymentId,
        string transactionCode,
        bool isSuccessFromGateway)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var payment = await _context.Payments
                .Include(p => p.Booking)
                .FirstOrDefaultAsync(p => p.PaymentId == paymentId && p.TransactionCode == transactionCode);

            if (payment == null)
                return (false, "Không tìm thấy thông tin giao dịch thanh toán.");

            if (payment.PaymentStatus is "Success" or "Completed")
            {
                // Idempotency: callback được gọi lại. Đồng bộ vé nếu trước đó
                // vé chưa được tạo (dữ liệu cũ / lỗi trước) mà không tạo trùng.
                await IssueTicketsForBookingAsync(payment.BookingId);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return (true, null);
            }
            if (payment.PaymentStatus == "PaidNeedRefund")
                return (false, "Giao dịch này cần được xử lý hoàn tiền thủ công.");

            if (!isSuccessFromGateway)
            {
                payment.PaymentStatus = "Failed";
                await _promotionService.ReleaseForBookingAsync(payment.BookingId);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return (false, "Giao dịch thanh toán không thành công từ phía cổng thanh toán.");
            }

            var booking = payment.Booking;
            var showtimeIsActive = booking != null && booking.Status == "Pending" &&
                await _context.Showtimes.AnyAsync(s => s.ShowtimeId == booking.ShowtimeId && s.Status == "Active");
            if (!showtimeIsActive)
            {
                payment.PaymentStatus = "PaidNeedRefund";
                payment.PaidAt = DateTime.UtcNow;
                await _promotionService.ReleaseForBookingAsync(payment.BookingId);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return (false, "Thanh toán đã được nhận nhưng suất chiếu không còn hoạt động; cần xử lý hoàn tiền.");
            }

            var seats = await _context.BookingDetails
                .Where(detail => detail.BookingId == payment.BookingId)
                .Select(detail => detail.ShowtimeSeat)
                .ToListAsync();
            if (seats.Count == 0 || seats.Any(seat => seat.Status != "Holding" ||
                    seat.LockedByUserId != booking!.UserId || seat.HoldExpiresAt == null ||
                    seat.HoldExpiresAt < DateTime.Now))
            {
                payment.PaymentStatus = "PaidNeedRefund";
                payment.PaidAt = DateTime.UtcNow;
                await _promotionService.ReleaseForBookingAsync(payment.BookingId);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return (false, "Thanh toán đã được nhận nhưng ghế không còn được giữ; cần xử lý hoàn tiền.");
            }

            payment.PaymentStatus = "Success";
            payment.PaidAt = DateTime.UtcNow;
            booking!.Status = "Paid";
            booking.TicketCode ??= GenerateTicketCode(payment.BookingId);
            foreach (var seat in seats)
            {
                seat.Status = "Booked";
                seat.HoldExpiresAt = null;
                seat.LockedByUserId = null;
            }

            await _promotionService.RedeemForBookingAsync(payment.BookingId);
            await _context.SaveChangesAsync();
            await IssueTicketsForBookingAsync(payment.BookingId);
            await transaction.CommitAsync();

            return (true, null);
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            return (false, "Không thể xác nhận thanh toán lúc này. Vui lòng thử lại.");
        }
    }

    public async Task ProcessBankTransferAsync(SePayWebhookDto dto)
    {
        if (!string.Equals(dto.TransferType, "in", StringComparison.OrdinalIgnoreCase)) return;
        if (await _context.BankTransactions.AnyAsync(x => x.ProviderTransactionId == dto.Id)) return;

        var log = new BankTransaction
        {
            ProviderTransactionId = dto.Id,
            ReferenceCode = dto.ReferenceCode,
            Amount = dto.TransferAmount,
            Content = dto.Content
        };

        var match = Regex.Match(dto.Code ?? dto.Content ?? "", @"MBPAY(\d+)", RegexOptions.IgnoreCase);
        if (!match.Success || !int.TryParse(match.Groups[1].Value, out var paymentId))
        {
            log.Result = "NoPaymentCode";
            await SaveLogAsync(log);
            return;
        }

        await using var tx = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

        var payment = await _context.Payments
            .Include(p => p.Booking)
            .FirstOrDefaultAsync(p => p.PaymentId == paymentId);

        if (payment == null)
        {
            log.Result = "PaymentNotFound";
        }
        else
        {
            log.PaymentId = payment.PaymentId;

            if (payment.PaymentStatus == "Failed")
            {
                // Khách chuyển tiền sau khi job đã hủy đơn: đánh dấu để hoàn tiền thủ công
                if (dto.TransferAmount == payment.Amount)
                {
                    payment.PaymentStatus = "PaidNeedRefund";
                    payment.PaidAt = DateTime.UtcNow;
                    await _promotionService.ReleaseForBookingAsync(payment.BookingId);
                    log.Result = "PaidAfterExpired";
                }
                else
                {
                    log.Result = "AmountMismatchAfterExpired";
                }
            }
            else if (payment.PaymentStatus != "Pending")
            {
                log.Result = "AlreadyProcessed";
                // Callback lặp lại: đồng bộ vé nếu giao dịch đã Success mà vé chưa có.
                if (payment.PaymentStatus is "Success" or "Completed")
                {
                    await _context.SaveChangesAsync();
                    await IssueTicketsForBookingAsync(payment.BookingId);
                }
            }
            else if (dto.TransferAmount != payment.Amount)
                log.Result = "AmountMismatch";
            else if (payment.Booking.Status != "Pending" ||
                     !await _context.Showtimes.AnyAsync(s => s.ShowtimeId == payment.Booking.ShowtimeId && s.Status == "Active"))
            {
                payment.PaymentStatus = "PaidNeedRefund";
                payment.PaidAt = DateTime.UtcNow;
                await _promotionService.ReleaseForBookingAsync(payment.BookingId);
                log.Result = "PaidAfterShowtimeClosed";
            }
            else
            {
                var affected = await _context.Payments
                    .Where(p => p.PaymentId == paymentId && p.PaymentStatus == "Pending")
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(p => p.PaymentStatus, "Success")
                        .SetProperty(p => p.TransactionCode, dto.ReferenceCode)
                        .SetProperty(p => p.PaidAt, DateTime.UtcNow));

                if (affected == 0)
                {
                    log.Result = "AlreadyProcessed";
                    // Giao dịch đã được xử lý ở luồng khác: bảo đảm vé đã được phát hành.
                    await _context.SaveChangesAsync();
                    await IssueTicketsForBookingAsync(payment.BookingId);
                }
                else
                {
                    var seats = await _context.BookingDetails
                        .Where(bd => bd.BookingId == payment.BookingId)
                        .Select(bd => bd.ShowtimeSeat)
                        .ToListAsync();

                    var userId = payment.Booking.UserId;
                    var seatsOk = seats.Count > 0 &&
                                  seats.All(s => s.Status == "Holding" && s.LockedByUserId == userId);

                    if (seatsOk)
                    {
                        foreach (var s in seats)
                        {
                            s.Status = "Booked";
                            s.HoldExpiresAt = null;
                        }
                        payment.Booking.Status = "Paid";
                        payment.Booking.TicketCode ??= GenerateTicketCode(payment.BookingId);
                        await _promotionService.RedeemForBookingAsync(payment.BookingId);
                        await _context.SaveChangesAsync();
                        await IssueTicketsForBookingAsync(payment.BookingId);
                        log.Result = "Success";
                    }
                    else
                    {
                        payment.PaymentStatus = "PaidNeedRefund";
                        await _promotionService.ReleaseForBookingAsync(payment.BookingId);
                        log.Result = "PaidButSeatLost";
                    }
                }
            }
        }

        _context.BankTransactions.Add(log);
        await _context.SaveChangesAsync();
        await tx.CommitAsync();

        if (log.Result == "Success")
        {
            await _ticketEmail.SendOnPaidAsync(payment!.BookingId);
        }
    }

    private async Task SaveLogAsync(BankTransaction log)
    {
        _context.BankTransactions.Add(log);
        try { await _context.SaveChangesAsync(); }
        catch (DbUpdateException) {}
    }

    public async Task<(bool Success, BankPaymentInfo? Info, string? Error)>
    CreateBankPaymentAsync(int bookingId, int userId)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var booking = await _context.Bookings
            .FirstOrDefaultAsync(b => b.BookingId == bookingId && b.UserId == userId);

        if (booking == null) return (false, null, "Booking không tồn tại.");
        if (booking.Status != "Pending") return (false, null, "Booking này không ở trạng thái chờ thanh toán.");
        if (!await _context.Showtimes.AnyAsync(s => s.ShowtimeId == booking.ShowtimeId && s.Status == "Active"))
            return (false, null, "Suất chiếu đã ngừng nhận thanh toán.");

        var seats = await _context.BookingDetails
            .Where(bd => bd.BookingId == bookingId)
            .Select(bd => bd.ShowtimeSeat)
            .ToListAsync();

        var now = DateTime.Now;

        // Ghế phải còn được chính user này giữ, nếu không thì không cho tạo QR
        if (seats.Count == 0 || seats.Any(s =>
                s.Status != "Holding" ||
                s.LockedByUserId != userId ||
                s.HoldExpiresAt == null || s.HoldExpiresAt < now))
            return (false, null, "Ghế đã hết thời gian giữ, vui lòng đặt lại.");

        var payment = await _context.Payments.FirstOrDefaultAsync(p =>
            p.BookingId == bookingId && p.Method == "SePay" && p.PaymentStatus == "Pending");

        if (payment == null)
        {
            payment = new Payment
            {
                BookingId = booking.BookingId,
                Amount = booking.TotalAmount,
                Method = "SePay",
                PaymentStatus = "Pending"
            };
            _context.Payments.Add(payment);
        }

        foreach (var s in seats) s.HoldExpiresAt = now.AddMinutes(15);

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        var bank = _config["SePay:BankCode"] ?? "";
        var acc = _config["SePay:AccountNumber"] ?? "";
        var name = _config["SePay:AccountName"] ?? "";
        var content = $"MBPAY{payment.PaymentId}";

        var qrUrl = $"https://img.vietqr.io/image/{bank}-{acc}-compact2.png" +
                    $"?amount={(long)payment.Amount}&addInfo={content}" +
                    $"&accountName={Uri.EscapeDataString(name)}";

        return (true, new BankPaymentInfo(payment.PaymentId, payment.Amount, content, qrUrl, bank, acc, name), null);
    }

    // -----------------------------------------------------------------------
    // ADMIN — paged list / summary / detail
    // -----------------------------------------------------------------------

    public async Task<PaginationResponseDto<AdminPaymentDto>> GetAdminPaymentsPagedAsync(AdminPaymentQueryDto query)
    {
        var q = _context.Payments.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Status))
            q = q.Where(p => p.PaymentStatus == query.Status);
        if (!string.IsNullOrWhiteSpace(query.Method))
            q = q.Where(p => p.Method == query.Method);

        if (!string.IsNullOrWhiteSpace(query.Keyword))
        {
            var kw = query.Keyword.Trim().ToLower();
            q = q.Where(p =>
                (p.TransactionCode != null && p.TransactionCode.ToLower().Contains(kw)) ||
                ("mb-" + p.BookingId.ToString("D6")).Contains(kw) ||
                p.Booking.User.FullName.ToLower().Contains(kw) ||
                p.Booking.User.Email.ToLower().Contains(kw));
        }

        if (!string.IsNullOrWhiteSpace(query.FromDate) && DateOnly.TryParse(query.FromDate, out var from))
            q = q.Where(p => p.PaidAt != null && DateOnly.FromDateTime(p.PaidAt.Value) >= from);
        if (!string.IsNullOrWhiteSpace(query.ToDate) && DateOnly.TryParse(query.ToDate, out var to))
            q = q.Where(p => p.PaidAt != null && DateOnly.FromDateTime(p.PaidAt.Value) <= to);

        q = (query.SortBy?.ToLower(), query.SortOrder?.ToLower()) switch
        {
            ("amount", "asc") => q.OrderBy(p => p.Amount),
            ("amount", _)     => q.OrderByDescending(p => p.Amount),
            (_, "asc")        => q.OrderBy(p => p.PaidAt ?? DateTime.MinValue),
            _                 => q.OrderByDescending(p => p.PaymentId),
        };

        var totalItems = await q.CountAsync();
        var pageSize   = Math.Clamp(query.PageSize, 1, 100);
        var page       = Math.Max(query.Page, 1);
        var totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);

        var data = await q
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new AdminPaymentDto(
                p.PaymentId,
                p.BookingId,
                "MB-" + p.BookingId.ToString("D6"),
                p.Booking.User.FullName,
                p.Booking.User.Email,
                p.Booking.Showtime.Movie.Title,
                p.Amount,
                p.Method,
                p.TransactionCode ?? "---",
                p.PaymentStatus,
                p.PaidAt.HasValue ? p.PaidAt.Value.ToString("yyyy-MM-dd HH:mm") : null))
            .ToListAsync();

        return new PaginationResponseDto<AdminPaymentDto>
        {
            Data = data, CurrentPage = page, PageSize = pageSize,
            TotalItems = totalItems, TotalPages = totalPages,
        };
    }

    public async Task<AdminPaymentSummaryDto> GetAdminPaymentSummaryAsync(AdminPaymentQueryDto query)
    {
        var q = _context.Payments.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Method))
            q = q.Where(p => p.Method == query.Method);
        if (!string.IsNullOrWhiteSpace(query.FromDate) && DateOnly.TryParse(query.FromDate, out var from))
            q = q.Where(p => p.PaidAt != null && DateOnly.FromDateTime(p.PaidAt.Value) >= from);
        if (!string.IsNullOrWhiteSpace(query.ToDate) && DateOnly.TryParse(query.ToDate, out var to))
            q = q.Where(p => p.PaidAt != null && DateOnly.FromDateTime(p.PaidAt.Value) <= to);

        var groups = await q
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Total     = g.Count(),
                Completed = g.Count(p => p.PaymentStatus == "Success" || p.PaymentStatus == "Completed"),
                Pending   = g.Count(p => p.PaymentStatus == "Pending"),
                Failed    = g.Count(p => p.PaymentStatus == "Failed"),
                Revenue   = g.Where(p => p.PaymentStatus == "Success" || p.PaymentStatus == "Completed")
                             .Sum(p => (decimal?)p.Amount) ?? 0m,
            })
            .FirstOrDefaultAsync();

        return new AdminPaymentSummaryDto
        {
            Total        = groups?.Total     ?? 0,
            Completed    = groups?.Completed ?? 0,
            Pending      = groups?.Pending   ?? 0,
            Failed       = groups?.Failed    ?? 0,
            TotalRevenue = groups?.Revenue   ?? 0m,
        };
    }

    public async Task<AdminPaymentDetailDto?> GetAdminPaymentDetailAsync(int paymentId)
    {
        var p = await _context.Payments
            .AsNoTracking()
            .Include(x => x.Booking).ThenInclude(b => b.User)
            .Include(x => x.Booking).ThenInclude(b => b.Showtime).ThenInclude(s => s.Movie)
            .Include(x => x.Booking).ThenInclude(b => b.Showtime).ThenInclude(s => s.Room).ThenInclude(r => r.Cinema)
            .Include(x => x.Booking).ThenInclude(b => b.BookingDetails)
                .ThenInclude(d => d.ShowtimeSeat).ThenInclude(ss => ss.Seat)
            .FirstOrDefaultAsync(x => x.PaymentId == paymentId);

        if (p == null) return null;

        return new AdminPaymentDetailDto
        {
            PaymentId       = p.PaymentId,
            Method          = p.Method,
            Amount          = p.Amount,
            Status          = p.PaymentStatus,
            TransactionCode = p.TransactionCode,
            PaidAt          = p.PaidAt?.ToString("yyyy-MM-dd HH:mm"),
            CreatedAt       = p.PaidAt?.ToString("yyyy-MM-dd HH:mm") ?? "---",
            BookingId       = p.BookingId,
            BookingCode     = "MB-" + p.BookingId.ToString("D6"),
            BookingStatus   = p.Booking.Status,
            CustomerName    = p.Booking.User.FullName,
            CustomerEmail   = p.Booking.User.Email,
            MovieTitle      = p.Booking.Showtime.Movie.Title,
            ShowDate        = p.Booking.Showtime.ShowDate.ToString("yyyy-MM-dd"),
            StartTime       = p.Booking.Showtime.StartTime.ToString("HH:mm"),
            CinemaName      = p.Booking.Showtime.Room.Cinema.Name,
            Seats           = p.Booking.BookingDetails
                .Select(d => d.ShowtimeSeat.Seat.SeatRow + d.ShowtimeSeat.Seat.SeatNumber.ToString())
                .ToList(),
        };
    }
}
