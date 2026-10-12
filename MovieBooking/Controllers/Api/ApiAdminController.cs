using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Bogus.Extensions.UnitedKingdom;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.DTOs;
using MovieBooking.Models;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Api;

[ApiController]
[Route("api/admin")]
public class ApiAdminController : ControllerBase
{
    private readonly MovieBookingContext _context;
    private readonly IMovieService _movieService;

    public ApiAdminController(MovieBookingContext context, IMovieService movieService)
    {
        _context = context;
        _movieService = movieService;
    }

    private bool IsAdmin()
    {
        var role = HttpContext.Session.GetString("Role");
        // Cho phép nếu là Admin, hoặc trong môi trường test/dev nếu cần
        return role == "Admin";
    }

    private static DateOnly VietnamToday => DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));

    [HttpGet("movies")]
    public async Task<IActionResult> GetMovies([FromQuery] int page = 1)
    {
        if (!IsAdmin())
        {
            return Unauthorized(new { message = "Bạn cần đăng nhập bằng tài khoản Admin." });
        }

        page = Math.Max(1, page);
        var movies = await _context.Movies
            .Include(m => m.Genres)
            .AsNoTracking()
            .OrderByDescending(m => m.CreatedAt)
            .Skip((page - 1) * 10)
            .Take(10)
            .ToListAsync();

        return Ok(movies.Select(m => new
            {
                id = m.MovieId,
                title = m.Title,
                description = m.Description,
                duration = m.Duration,
                releaseDate = m.ReleaseDate.HasValue ? m.ReleaseDate.Value.ToString("yyyy-MM-dd") : null,
                endDate = m.EndDate.HasValue ? m.EndDate.Value.ToString("yyyy-MM-dd") : null,
                posterUrl = m.PosterUrl,
                trailerUrl = m.TrailerUrl,
                director = m.Director,
                actors = m.Actors,
                language = m.Language,
                ageRating = m.AgeRating,
                status = m.Status,
                isExpired = m.EndDate.HasValue && m.EndDate.Value < VietnamToday,
                genres = m.Genres.Select(g => new { id = g.GenreId, name = g.GenreName }).ToList()
            }));
    }

    [HttpGet("movies/{id}")]
    public async Task<IActionResult> GetMovie(int id)
    {
        if (!IsAdmin())
        {
            return Unauthorized(new { message = "Bạn cần đăng nhập bằng tài khoản Admin." });
        }

        var movie = await _movieService.GetMovieByIdAsync(id, includeExpired: true);
        if (movie == null) return NotFound(new { message = "Không tìm thấy phim." });

        return Ok(new
        {
            id = movie.MovieId,
            title = movie.Title,
            description = movie.Description,
            duration = movie.Duration,
            releaseDate = movie.ReleaseDate?.ToString("yyyy-MM-dd"),
            endDate = movie.EndDate?.ToString("yyyy-MM-dd"),
            posterUrl = movie.PosterUrl,
            trailerUrl = movie.TrailerUrl,
            director = movie.Director,
            actors = movie.Actors,
            language = movie.Language,
            ageRating = movie.AgeRating,
            status = movie.Status,
            isExpired = movie.EndDate.HasValue && movie.EndDate.Value < VietnamToday,
            genres = movie.Genres.Select(g => new { id = g.GenreId, name = g.GenreName }).ToList()
        });
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

    public class UpdateShowRequest
    {
        public int? MovieId { get; set; }
        public int? RoomId { get; set; } 

        public string? Date {get; set;} = string.Empty;
        public string? StartTime { get; set; } = string.Empty;

        public decimal? Price { get; set; }
        public string? Status {get; set; } 
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

    [HttpPatch("shows/{id}")]
    public async Task<IActionResult> UpdateShow(
        int id,
        [FromBody] UpdateShowRequest request
    )
    {
        var showtime = await _context.Showtimes
            .Include(s => s.Movie)
            .FirstOrDefaultAsync(s => s.ShowtimeId == id);

        if(showtime == null)
        {
            return NotFound(new
            {
                message = "Không tìm thấy suất chiếu."
            });
        }

         // Sua phong 
        if(request.RoomId.HasValue)
        {
            var room = await _context.Rooms.FirstOrDefaultAsync
            (r => r.RoomId == request.RoomId.Value);

            if(room == null)
            {
                return BadRequest(new
                {
                        message = "Không tìm thấy phòng chiếu."
                });
            }

            showtime.RoomId = room.RoomId;
        } 

        // Sua ngay 
        if(!string.IsNullOrEmpty(request.Date))
        {
            if(!DateOnly.TryParse(request.Date, out var showDate))
            {
                return BadRequest(new
                {
                    message = "Ngày không hợp lệ."
                });
            }

            showtime.ShowDate = showDate;
        }

        // Sua gio bat dau 
        if(!string.IsNullOrEmpty(request.StartTime))
        {
            if(!TimeOnly.TryParse(request.StartTime, out var startTime))
            {
                return BadRequest(new
                    {
                        message = "Giờ không hợp lệ."
                    });
            }
            showtime.StartTime = startTime;
            // Tinh lai gio ket thuc 
            showtime.EndTime = startTime.AddMinutes(showtime.Movie.Duration + 15);
        }

        // Sua gia 
        if(request.Price.HasValue)
        {
            if(request.Price.Value <= 0)
            {
                return BadRequest(new
                {
                    message = "Giá vé phải lớn hơn 0."
                });
            }
            showtime.Price = request.Price.Value;
        }

        if(!string.IsNullOrEmpty(request.Status))
        {
            showtime.Status = request.Status;
        }

        // luu DB 
        await _context.SaveChangesAsync();
        return Ok(new
        {
            success = true,
            message = "Cập nhật suất chiếu thành công!"
        });
    }

    [HttpDelete("shows/{id}")]
    public async Task<IActionResult> DeleteShow(int id)
    {
        var showtime = await _context.Showtimes.FirstOrDefaultAsync(s => s.ShowtimeId == id);

        if(showtime == null)
        {
             return NotFound(new
            {
                message = "Không tìm thấy suất chiếu."
            });
        }

        // Check da booking chua 
        var hasBooking = await _context.Bookings.AnyAsync(b => b.ShowtimeId == id);
        
        if(hasBooking)
        {
            return BadRequest(new
            {
                message = "Không thể xóa suất chiếu vì đã có người đặt vé."
            });
        }

        // Xoa showTimeSeat truoc 
        var showTimeSeat = await _context.ShowtimeSeats.Where(s => s.ShowtimeId == id).ToListAsync();
        _context.Showtimes.Remove(showtime);
        await _context.SaveChangesAsync();
        
        return Ok(new
        {
           success = true,
           message =  "Xóa suất chiếu thành công!"
        });
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

    [HttpPost("movies")]
    public async Task<IActionResult> CreateMovie([FromBody] MovieFormDto model)
    {
        if (!IsAdmin())
        {
            return Unauthorized(new { message = "Bạn cần đăng nhập bằng tài khoản Admin." });
        }

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        if (await _movieService.MovieTitleExistsAsync(model.Title))
        {
            return Conflict(new { message = "Tên phim này đã tồn tại." });
        }

        var movie = await _movieService.CreateMovieAsync(model);
        return Ok(new
        {
            success = true,
            message = "Tạo phim mới thành công!",
            movieId = movie.MovieId,
            title = movie.Title
        });
    }

    [HttpPut("movies/{id}")]
    public async Task<IActionResult> UpdateMovie(int id, [FromBody] MovieFormDto model)
    {
        if (!IsAdmin())
        {
            return Unauthorized(new { message = "Bạn cần đăng nhập bằng tài khoản Admin." });
        }

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        if (await _movieService.MovieTitleExistsAsync(model.Title, id))
        {
            return Conflict(new { message = "Tên phim này đã được sử dụng bởi phim khác." });
        }

        var success = await _movieService.UpdateMovieAsync(id, model);
        if (!success)
        {
            return NotFound(new { message = "Không tìm thấy phim cần cập nhật." });
        }

        return Ok(new
        {
            success = true,
            message = "Cập nhật thông tin phim thành công!"
        });
    }

    [HttpDelete("movies/{id}")]
    public async Task<IActionResult> DeleteMovie(int id)
    {
        if (!IsAdmin())
        {
            return Unauthorized(new { message = "Bạn cần đăng nhập bằng tài khoản Admin." });
        }

        if (!await _context.Movies.AnyAsync(m => m.MovieId == id))
        {
            return NotFound(new { message = "Không tìm thấy phim." });
        }

        if (await _context.Showtimes.AnyAsync(s => s.MovieId == id) ||
            await _context.Reviews.AnyAsync(r => r.MovieId == id))
        {
            return Conflict(new { message = "Không thể xóa phim đã có suất chiếu hoặc đánh giá." });
        }

        var success = await _movieService.DeleteMovieAsync(id);
        if (!success)
        {
            return NotFound(new { message = "Không tìm thấy phim hoặc không thể xóa." });
        }

        return Ok(new
        {
            success = true,
            message = "Xóa phim thành công!"
        });
    }
}
