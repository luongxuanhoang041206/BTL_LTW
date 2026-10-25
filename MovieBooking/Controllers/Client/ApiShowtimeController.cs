using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Filters;

namespace MovieBooking.Controllers.Client;

[ApiController]
[Route("api/admin/showtimes")]
[SessionAuthorizeRole("Admin")]
public class ApiShowtimeController : ControllerBase
{
    private readonly MovieBookingContext _context;

    public ApiShowtimeController(MovieBookingContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var showtimes = await _context.Showtimes
            .AsNoTracking()
            .Include(showtime => showtime.Movie)
            .Include(showtime => showtime.Room)
                .ThenInclude(room => room.Cinema)
            .OrderByDescending(showtime => showtime.ShowDate)
            .ThenByDescending(showtime => showtime.StartTime)
            .Select(showtime => new
            {
                showtimeId = showtime.ShowtimeId,
                movieId = showtime.MovieId,
                movieTitle = showtime.Movie.Title,
                cinemaId = showtime.Room.CinemaId,
                cinemaName = showtime.Room.Cinema.Name,
                roomId = showtime.RoomId,
                roomName = showtime.Room.RoomName,
                showDate = showtime.ShowDate.ToString("yyyy-MM-dd"),
                startTime = showtime.StartTime.ToString("HH:mm"),
                endTime = showtime.EndTime.ToString("HH:mm"),
                price = showtime.Price,
                status = showtime.Status
            })
            .ToListAsync();

        return Ok(showtimes);
    }
}
