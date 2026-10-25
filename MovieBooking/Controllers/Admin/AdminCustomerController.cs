using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;

namespace MovieBooking.Controllers.Admin;

public class AdminCustomerController : AdminBaseController
{
    public AdminCustomerController(MovieBookingContext context) : base(context) { }

    [HttpGet("customers")]
    public async Task<IActionResult> GetCustomers([FromQuery] string? search)
    {
        var query = _context.Users
            .Where(u => u.Role == "Customer")
            .Include(u => u.Bookings)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(u => u.FullName.ToLower().Contains(term) || u.Email.ToLower().Contains(term) || (u.Phone != null && u.Phone.Contains(term)));
        }

        var customers = await query
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new
            {
                id = u.UserId,
                fullName = u.FullName,
                email = u.Email,
                phone = u.Phone ?? "---",
                status = u.Status,
                createdAt = u.CreatedAt.ToString("yyyy-MM-dd"),
                bookingCount = u.Bookings.Count,
                totalSpent = u.Bookings.Where(b => b.Status == "Confirmed").Sum(b => (decimal?)b.TotalAmount) ?? 0
            })
            .ToListAsync();

        return Ok(customers);
    }

    [HttpPatch("customers/{id}/toggle-status")]
    public async Task<IActionResult> ToggleCustomerStatus(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "Không tìm thấy khách hàng." });

        user.Status = !user.Status;
        await _context.SaveChangesAsync();
        return Ok(new { success = true, userId = user.UserId, status = user.Status, message = user.Status ? "Mở khóa tài khoản thành công!" : "Đã khóa tài khoản khách hàng!" });
    }

    [HttpGet("customers/{id}/bookings")]
    public async Task<IActionResult> GetCustomerBookings(int id)
    {
        var bookings = await _context.Bookings
            .Where(b => b.UserId == id)
            .Include(b => b.Showtime)
                .ThenInclude(s => s.Movie)
            .Include(b => b.BookingDetails)
                .ThenInclude(bd => bd.ShowtimeSeat)
                    .ThenInclude(ss => ss.Seat)
            .OrderByDescending(b => b.BookingDate)
            .Select(b => new
            {
                bookingId = b.BookingId,
                movieTitle = b.Showtime.Movie.Title,
                showDate = b.Showtime.ShowDate.ToString("yyyy-MM-dd"),
                startTime = b.Showtime.StartTime.ToString("HH:mm"),
                seats = b.BookingDetails.Select(bd => bd.ShowtimeSeat.Seat.SeatRow + bd.ShowtimeSeat.Seat.SeatNumber).ToList(),
                totalAmount = b.TotalAmount,
                status = b.Status,
                bookingDate = b.BookingDate.ToString("yyyy-MM-dd HH:mm")
            })
            .ToListAsync();

        return Ok(bookings);
    }
}
