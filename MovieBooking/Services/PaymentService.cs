using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.DTOs;
using MovieBooking.Models;
using MovieBooking.Services.Interfaces;
using System;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace MovieBooking.Services;

public class PaymentService : IPaymentService
{
    private readonly MovieBookingContext _context;
    private readonly IConfiguration _config;

    public PaymentService(MovieBookingContext context , IConfiguration config)
    {
        _context = context;
        _config = config;
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

    public async Task<(bool Success, int? PaymentId, string? PaymentUrl, string? Error)> InitializePaymentAsync(
        int bookingId,
        int userId,
        string method,
        string ipAddress)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var booking = await _context.Bookings
            .FirstOrDefaultAsync(b => b.BookingId == bookingId && b.UserId == userId);

            if (booking == null)
                return (false, null, null, "Booking không tồn tại.");
            if (booking.Status != "Pending")
                return (false, null, null, "Booking này không ở trạng thái chờ thanh toán.");
            if (booking.Status == "Paid")
                return (false, null, null, "Booking này đã được thanh toán trước đó rồi.");

            var now = DateTime.Now;

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

            // Mô phỏng URL chuyển hướng thanh toán (hoặc URL tích hợp cổng thanh toán thực tế)
            string mockGatewayUrl = $"/Payment/ReturnResult?paymentId={payment.PaymentId}&transactionCode={payment.TransactionCode}&success=true";

            return (true, payment.PaymentId, mockGatewayUrl, null);
        }    
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return (false, null, null, "Đã xảy ra lỗi hệ thống khi khởi tạo thanh toán: " + ex.Message);
        }
    }

    public async Task<(bool Success, string? Error)> ConfirmPaymentResultAsync(
        int paymentId,
        string transactionCode,
        bool isSuccessFromGateway)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var payment = await _context.Payments
                .Include(p => p.Booking)
                .FirstOrDefaultAsync(p => p.PaymentId == paymentId && p.TransactionCode == transactionCode);

            if (payment == null)
                return (false, "Không tìm thấy thông tin giao dịch thanh toán.");

            if (payment.PaymentStatus == "Success")
                return (true, null); // Idempotency (đã xử lý trước đó rồi)

            if (!isSuccessFromGateway)
            {
                payment.PaymentStatus = "Failed";
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return (false, "Giao dịch thanh toán không thành công từ phía cổng thanh toán.");
            }

            payment.PaymentStatus = "Success";
            payment.PaidAt = DateTime.UtcNow;

            if (payment.Booking != null)
            {
                payment.Booking.Status = "Paid";
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return (true, null);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return (false, "Lỗi xử lý xác nhận thanh toán: " + ex.Message);
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

        await using var tx = await _context.Database.BeginTransactionAsync();

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

            if (payment.PaymentStatus != "Pending")
                log.Result = "AlreadyProcessed";
            else if (dto.TransferAmount != payment.Amount)
                log.Result = "AmountMismatch";
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
                        payment.Booking.Status = "Confirmed";
                        log.Result = "Success";
                    }
                    else
                    {
                        payment.PaymentStatus = "PaidNeedRefund";
                        log.Result = "PaidButSeatLost";
                    }
                }
            }
        }

        _context.BankTransactions.Add(log);
        await _context.SaveChangesAsync();
        await tx.CommitAsync();
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
        var booking = await _context.Bookings
            .FirstOrDefaultAsync(b => b.BookingId == bookingId && b.UserId == userId);

        if (booking == null) return (false, null, "Booking không tồn tại.");
        if (booking.Status != "Pending") return (false, null, "Booking này không ở trạng thái chờ thanh toán.");

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
            p.BookingId == bookingId && p.Method == "BANK" && p.PaymentStatus == "Pending");

        if (payment == null)
        {
            payment = new Payment
            {
                BookingId = booking.BookingId,
                Amount = booking.TotalAmount,
                Method = "BANK",
                PaymentStatus = "Pending"
            };
            _context.Payments.Add(payment);
        }

        foreach (var s in seats) s.HoldExpiresAt = now.AddMinutes(15);

        await _context.SaveChangesAsync();

        var bank = _config["SePay:BankCode"] ?? "";
        var acc = _config["SePay:AccountNumber"] ?? "";
        var name = _config["SePay:AccountName"] ?? "";
        var content = $"MBPAY{payment.PaymentId}";

        var qrUrl = $"https://img.vietqr.io/image/{bank}-{acc}-compact2.png" +
                    $"?amount={(long)payment.Amount}&addInfo={content}" +
                    $"&accountName={Uri.EscapeDataString(name)}";

        return (true, new BankPaymentInfo(payment.PaymentId, payment.Amount, content, qrUrl, bank, acc, name), null);
    }
}
