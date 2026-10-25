using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Models;

namespace MovieBooking.Controllers.Admin;

public class AdminShowController : AdminBaseController
{
    public AdminShowController(MovieBookingContext context) : base(context) { }

    public class AddShowRequest
    {
        public int MovieId { get; set; }
        public int RoomId { get; set; }
        public string Date { get; set; } = string.Empty; // yyyy-MM-dd
        public string StartTime { get; set; } = string.Empty; // HH:mm
        public decimal Price { get; set; }
        public decimal? VipMultiplier { get; set; }
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
            VipMultiplier = (request.VipMultiplier.HasValue && request.VipMultiplier.Value > 0) ? request.VipMultiplier.Value : 1.2m,
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
}
