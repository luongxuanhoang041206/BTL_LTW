using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;

namespace MovieBooking.Controllers.Admin;

public class AdminBookingController : AdminBaseController
{
    public AdminBookingController(MovieBookingContext context) : base(context) { }

    [HttpGet("bookings")]
    public async Task<IActionResult> GetAllBookings()
    {
        var bookings = await _context.Bookings
            .Include(b => b.User)
            .Include(b => b.Showtime)
                .ThenInclude(s => s.Movie)
            .Include(b => b.BookingDetails)
                .ThenInclude(bd => bd.ShowtimeSeat)
                    .ThenInclude(ss => ss.Seat)
            .OrderByDescending(b => b.BookingDate)
            .Select(b => new
            {
                bookingId = b.BookingId,
                bookingCode = "MB-" + b.BookingId.ToString("D6"),
                customerName = b.User.FullName,
                customerEmail = b.User.Email,
                movieTitle = b.Showtime.Movie.Title,
                posterUrl = b.Showtime.Movie.PosterUrl,
                showDate = b.Showtime.ShowDate.ToString("yyyy-MM-dd"),
                startTime = b.Showtime.StartTime.ToString("HH:mm"),
                bookingDate = b.BookingDate.ToString("yyyy-MM-dd HH:mm"),
                seatCount = b.BookingDetails.Count,
                seats = b.BookingDetails.Select(bd => bd.ShowtimeSeat.Seat.SeatRow + bd.ShowtimeSeat.Seat.SeatNumber).ToList(),
                finalAmount = b.TotalAmount,
                status = b.Status
            })
            .ToListAsync();

        return Ok(bookings);
    }
}
