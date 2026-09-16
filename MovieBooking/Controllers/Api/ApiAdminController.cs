using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Models;

namespace MovieBooking.Controllers.Api;

[ApiController]
[Route("api/admin")]
public class ApiAdminController : ControllerBase
{
    private readonly MovieBookingContext _context;

    public ApiAdminController(MovieBookingContext context)
    {
        _context = context;
    }

    private bool IsAdmin()
    {
        var role = HttpContext.Session.GetString("Role");
        // Cho phép nếu là Admin, hoặc trong môi trường test/dev nếu cần
        return role == "Admin";
    }

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

    [HttpGet("shows")]
    public async Task<IActionResult> GetShows()
    {
        var shows = await _context.Showtimes
            .Include(s => s.Movie)
            .Include(s => s.Room)
                .ThenInclude(r => r.Cinema)
            .Include(s => s.ShowtimeSeats)
            .OrderByDescending(s => s.ShowDate)
            .ThenByDescending(s => s.StartTime)
            .Select(s => new
            {
                showtimeId = s.ShowtimeId,
                movieId = s.MovieId,
                movieTitle = s.Movie.Title,
                posterUrl = s.Movie.PosterUrl,
                showDateTime = $"{s.ShowDate:yyyy-MM-dd}T{s.StartTime:HH:mm:ss}",
                cinemaName = s.Room.Cinema.Name,
                roomName = s.Room.RoomName,
                price = s.Price,
                totalBookings = s.ShowtimeSeats.Count(ss => ss.Status == "Booked"),
                totalSeats = s.ShowtimeSeats.Count,
                earnings = s.ShowtimeSeats.Count(ss => ss.Status == "Booked") * s.Price
            })
            .ToListAsync();

        return Ok(shows);
    }

    public class AddShowRequest
    {
        public int MovieId { get; set; }
        public int RoomId { get; set; }
        public string Date { get; set; } = string.Empty; // yyyy-MM-dd
        public string StartTime { get; set; } = string.Empty; // HH:mm
        public decimal Price { get; set; }
    }

    [HttpPost("shows")]
    public async Task<IActionResult> AddShow([FromBody] AddShowRequest request)
    {
        if (!DateOnly.TryParse(request.Date, out var showDate) ||
            !TimeOnly.TryParse(request.StartTime, out var startTime))
        {
            return BadRequest(new { message = "Định dạng ngày hoặc giờ không hợp lệ." });
        }

        var movie = await _context.Movies.FindAsync(request.MovieId);
        if (movie == null) return BadRequest(new { message = "Không tìm thấy phim." });

        // Mặc định chọn Room đầu tiên nếu roomId = 0
        var room = request.RoomId > 0
            ? await _context.Rooms.FindAsync(request.RoomId)
            : await _context.Rooms.FirstOrDefaultAsync();

        if (room == null) return BadRequest(new { message = "Không tìm thấy phòng chiếu." });

        var endTime = startTime.AddMinutes(movie.Duration + 15); // Thời lượng + 15p dọn phòng

        var showtime = new Showtime
        {
            MovieId = movie.MovieId,
            RoomId = room.RoomId,
            ShowDate = showDate,
            StartTime = startTime,
            EndTime = endTime,
            Price = request.Price > 0 ? request.Price : 75000,
            Status = "Active"
        };

        _context.Showtimes.Add(showtime);
        await _context.SaveChangesAsync();

        // Tự động sinh ShowtimeSeat từ Seat của Room
        var roomSeats = await _context.Seats.Where(s => s.RoomId == room.RoomId).ToListAsync();
        foreach (var seat in roomSeats)
        {
            _context.ShowtimeSeats.Add(new ShowtimeSeat
            {
                ShowtimeId = showtime.ShowtimeId,
                SeatId = seat.SeatId,
                Status = "Available"
            });
        }
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Thêm suất chiếu thành công!", showtimeId = showtime.ShowtimeId });
    }

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
