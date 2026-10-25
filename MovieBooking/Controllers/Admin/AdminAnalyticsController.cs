using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;

namespace MovieBooking.Controllers.Admin;

public class AdminAnalyticsController : AdminBaseController
{
    public AdminAnalyticsController(MovieBookingContext context) : base(context) { }

    [HttpGet("analytics/revenue")]
    public async Task<IActionResult> GetRevenueAnalytics()
    {
        var confirmedBookings = await _context.Bookings
            .Where(b => b.Status == "Confirmed")
            .Include(b => b.Showtime)
                .ThenInclude(s => s.Movie)
            .Include(b => b.Showtime)
                .ThenInclude(s => s.Room)
                    .ThenInclude(r => r.Cinema)
            .AsNoTracking()
            .ToListAsync();

        var totalRevenue = confirmedBookings.Sum(b => b.TotalAmount);
        var totalConfirmedBookings = confirmedBookings.Count;
        var avgTicketValue = totalConfirmedBookings > 0 ? totalRevenue / totalConfirmedBookings : 0;

        // Doanh thu theo 7 ngày gần nhất
        var now = DateTime.Now.Date;
        var dailyRevenue = new List<object>();
        for (int i = 6; i >= 0; i--)
        {
            var day = now.AddDays(-i);
            var dayAmount = confirmedBookings
                .Where(b => b.BookingDate.Date == day)
                .Sum(b => b.TotalAmount);

            dailyRevenue.Add(new
            {
                date = day.ToString("dd/MM"),
                revenue = dayAmount
            });
        }

        // Top 5 phim có doanh thu cao nhất
        var movieRevenue = confirmedBookings
            .GroupBy(b => b.Showtime.Movie.Title)
            .Select(g => new
            {
                movieTitle = g.Key,
                revenue = g.Sum(b => b.TotalAmount),
                bookingsCount = g.Count()
            })
            .OrderByDescending(x => x.revenue)
            .Take(5)
            .ToList();

        // Doanh thu theo Rạp
        var cinemaRevenue = confirmedBookings
            .GroupBy(b => b.Showtime.Room.Cinema.Name)
            .Select(g => new
            {
                cinemaName = g.Key,
                revenue = g.Sum(b => b.TotalAmount)
            })
            .OrderByDescending(x => x.revenue)
            .ToList();

        return Ok(new
        {
            totalRevenue,
            totalConfirmedBookings,
            avgTicketValue,
            dailyRevenue,
            topMovies = movieRevenue,
            cinemaRevenue
        });
    }

    [HttpGet("analytics/showtime-performance")]
    public async Task<IActionResult> GetShowtimePerformance()
    {
        var showtimes = await _context.Showtimes
            .Include(s => s.Movie)
            .Include(s => s.Room)
                .ThenInclude(r => r.Cinema)
            .Include(s => s.ShowtimeSeats)
            .AsNoTracking()
            .OrderByDescending(s => s.ShowDate)
            .ThenByDescending(s => s.StartTime)
            .Take(50)
            .Select(s => new
            {
                showtimeId = s.ShowtimeId,
                movieTitle = s.Movie.Title,
                cinemaName = s.Room.Cinema.Name,
                roomName = s.Room.RoomName,
                showDate = s.ShowDate.ToString("yyyy-MM-dd"),
                startTime = s.StartTime.ToString("HH:mm"),
                price = s.Price,
                totalSeats = s.ShowtimeSeats.Count,
                bookedSeats = s.ShowtimeSeats.Count(ss => ss.Status == "Booked"),
                occupancyRate = s.ShowtimeSeats.Count > 0
                    ? Math.Round((double)s.ShowtimeSeats.Count(ss => ss.Status == "Booked") / s.ShowtimeSeats.Count * 100, 1)
                    : 0,
                revenue = s.ShowtimeSeats.Count(ss => ss.Status == "Booked") * s.Price
            })
            .ToListAsync();

        return Ok(showtimes);
    }

    [HttpGet("analytics/seat-occupancy")]
    public async Task<IActionResult> GetSeatOccupancy()
    {
        var rooms = await _context.Rooms
            .Include(r => r.Cinema)
            .Include(r => r.Showtimes)
                .ThenInclude(s => s.ShowtimeSeats)
            .AsNoTracking()
            .Select(r => new
            {
                cinemaName = r.Cinema.Name,
                roomName = r.RoomName,
                roomType = r.RoomType,
                totalSeats = r.TotalSeats,
                totalShowtimes = r.Showtimes.Count,
                totalSeatsOffered = r.Showtimes.SelectMany(s => s.ShowtimeSeats).Count(),
                totalSeatsBooked = r.Showtimes.SelectMany(s => s.ShowtimeSeats).Count(ss => ss.Status == "Booked"),
                occupancyRate = r.Showtimes.SelectMany(s => s.ShowtimeSeats).Any()
                    ? Math.Round((double)r.Showtimes.SelectMany(s => s.ShowtimeSeats).Count(ss => ss.Status == "Booked") /
                        r.Showtimes.SelectMany(s => s.ShowtimeSeats).Count() * 100, 1)
                    : 0
            })
            .ToListAsync();

        return Ok(rooms);
    }
}
