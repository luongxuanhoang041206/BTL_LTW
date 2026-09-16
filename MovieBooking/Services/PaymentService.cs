using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Models;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Services;

public class PaymentService : IPaymentService
{
    private readonly MovieBookingContext _context;

    public PaymentService(MovieBookingContext context)
    {
        _context = context;
    }

    public async Task<(bool Success, int? PaymentId, string? Error)> ProcessPaymentAsync(
        int bookingId,
        int userId,
        string method,
        bool simulateFailure = false)
    {
        var booking = await _context.Bookings
            .FirstOrDefaultAsync(b => b.BookingId == bookingId && b.UserId == userId);

        if (booking == null)
            return (false, null, "Booking không tồn tại.");

        if (booking.Status != "Pending")
            return (false, null, "Booking này không ở trạng thái chờ thanh toán.");

        var now = DateTime.Now;

        // Tạo Payment record mới cho mỗi lần thử
        var payment = new Payment
        {
            BookingId       = bookingId,
            Amount          = booking.TotalAmount,
            Method          = method,
            TransactionCode = GenerateTransactionCode(method),
            PaymentStatus   = "Pending",
            PaidAt          = null
        };
        _context.Payments.Add(payment);
        await _context.SaveChangesAsync(); // Lấy PaymentId

        if (simulateFailure)
        {
            // Giả lập thất bại (dev mode)
            payment.PaymentStatus = "Failed";
            await _context.SaveChangesAsync();
            return (false, payment.PaymentId, "Thanh toán thất bại (giả lập). Vui lòng thử lại.");
        }

        // Tất cả method (COD, VNPay stub, Momo stub) → simulated success
        payment.PaymentStatus = "Success";
        payment.PaidAt        = now;

        booking.Status = "Paid";

        await _context.SaveChangesAsync();
        return (true, payment.PaymentId, null);
    }

    private static string GenerateTransactionCode(string method)
    {
        var prefix = method.ToUpper() switch
        {
            "VNPAY" => "VNP",
            "MOMO"  => "MM",
            _       => "TXN"
        };
        return $"{prefix}{DateTime.Now:yyyyMMddHHmmss}{new Random().Next(1000, 9999)}";
    }
}
