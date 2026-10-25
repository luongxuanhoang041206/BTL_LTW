using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;

namespace MovieBooking.Controllers.Admin;

public class AdminDashboardController : AdminBaseController
{
    public AdminDashboardController(MovieBookingContext context) : base(context) { }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var totalBookings = await _context.Bookings.CountAsync();
        var totalRevenue = await _context.Bookings
            .Where(b => b.Status == "Confirmed")
            .SumAsync(b => (decimal?)b.TotalAmount) ?? 0;
        var activeShowsCount = await _context.Showtimes
            .CountAsync(s => s.Status == "Active");
        var totalUsers = await _context.Users.CountAsync();

        var recentShows = await _context.Showtimes
            .Include(s => s.Movie)
            .Include(s => s.Room)
            .Where(s => s.Status == "Active")
            .OrderByDescending(s => s.ShowDate)
            .Take(5)
            .Select(s => new
            {
                showtimeId = s.ShowtimeId,
                movieTitle = s.Movie.Title,
                showDate = s.ShowDate.ToString("yyyy-MM-dd"),
                startTime = s.StartTime.ToString("HH:mm"),
                price = s.Price
            })
            .ToListAsync();

        return Ok(new
        {
            totalBookings,
            totalRevenue,
            activeShowsCount,
            totalUsers,
            recentShows
        });
    }
}
