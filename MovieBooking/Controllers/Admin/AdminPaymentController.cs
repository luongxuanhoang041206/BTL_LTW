using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;

namespace MovieBooking.Controllers.Admin;

public class AdminPaymentController : AdminBaseController
{
    public AdminPaymentController(MovieBookingContext context) : base(context) { }

    [HttpGet("payments")]
    public async Task<IActionResult> GetPayments([FromQuery] string? status, [FromQuery] string? method)
    {
        var query = _context.Payments
            .Include(p => p.Booking)
                .ThenInclude(b => b.User)
            .Include(p => p.Booking)
                .ThenInclude(b => b.Showtime)
                    .ThenInclude(s => s.Movie)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(p => p.PaymentStatus == status);

        if (!string.IsNullOrWhiteSpace(method))
            query = query.Where(p => p.Method == method);

        var payments = await query
            .OrderByDescending(p => p.PaymentId)
            .Take(100)
            .Select(p => new
            {
                id = p.PaymentId,
                bookingId = p.BookingId,
                bookingCode = "MB-" + p.BookingId.ToString("D6"),
                customerName = p.Booking.User.FullName,
                customerEmail = p.Booking.User.Email,
                movieTitle = p.Booking.Showtime.Movie.Title,
                amount = p.Amount,
                method = p.Method,
                transactionCode = p.TransactionCode ?? "---",
                status = p.PaymentStatus,
                paidAt = p.PaidAt.HasValue ? p.PaidAt.Value.ToString("yyyy-MM-dd HH:mm") : null
            })
            .ToListAsync();

        return Ok(payments);
    }

    [HttpPost("payments/{id}/verify")]
    public async Task<IActionResult> VerifyPayment(int id)
    {
        var payment = await _context.Payments
            .Include(p => p.Booking)
            .FirstOrDefaultAsync(p => p.PaymentId == id);

        if (payment == null) return NotFound(new { message = "Không tìm thấy giao dịch." });

        payment.PaymentStatus = "Completed";
        payment.PaidAt = DateTime.Now;
        if (payment.Booking != null)
        {
            payment.Booking.Status = "Confirmed";
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Xác nhận thanh toán thành công!" });
    }
}
