using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Models;

namespace MovieBooking.Controllers.Admin;

public class AdminCinemaController : AdminBaseController
{
    public AdminCinemaController(MovieBookingContext context) : base(context) { }

    public class CinemaRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? Phone { get; set; }
    }

    [HttpGet("cinemas")]
    public async Task<IActionResult> GetCinemas()
    {
        var cinemas = await _context.Cinemas
            .AsNoTracking()
            .Select(c => new
            {
                id = c.CinemaId,
                name = c.Name,
                address = c.Address ?? "",
                city = c.City ?? "",
                phone = c.Phone ?? "",
                roomCount = c.Rooms.Count,
                activeShowsCount = c.Rooms.SelectMany(r => r.Showtimes).Count(s => s.Status == "Active")
            })
            .OrderBy(c => c.name)
            .ToListAsync();

        return Ok(cinemas);
    }

    [HttpPost("cinemas")]
    public async Task<IActionResult> CreateCinema([FromBody] CinemaRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Tên rạp không được để trống." });

        var cinema = new Cinema
        {
            Name = request.Name.Trim(),
            Address = request.Address?.Trim(),
            City = request.City?.Trim(),
            Phone = request.Phone?.Trim()
        };

        _context.Cinemas.Add(cinema);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Thêm rạp chiếu phim thành công!", id = cinema.CinemaId });
    }

    [HttpPut("cinemas/{id}")]
    public async Task<IActionResult> UpdateCinema(int id, [FromBody] CinemaRequest request)
    {
        var cinema = await _context.Cinemas.FindAsync(id);
        if (cinema == null) return NotFound(new { message = "Không tìm thấy rạp chiếu." });

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Tên rạp không được để trống." });

        cinema.Name = request.Name.Trim();
        cinema.Address = request.Address?.Trim();
        cinema.City = request.City?.Trim();
        cinema.Phone = request.Phone?.Trim();

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Cập nhật thông tin rạp thành công!" });
    }

    [HttpDelete("cinemas/{id}")]
    public async Task<IActionResult> DeleteCinema(int id)
    {
        var cinema = await _context.Cinemas
            .Include(c => c.Rooms)
            .FirstOrDefaultAsync(c => c.CinemaId == id);

        if (cinema == null) return NotFound(new { message = "Không tìm thấy rạp chiếu." });

        if (cinema.Rooms.Count > 0)
            return BadRequest(new { message = $"Không thể xóa rạp vì đang có {cinema.Rooms.Count} phòng chiếu. Vui lòng chuyển hoặc xóa phòng trước." });

        _context.Cinemas.Remove(cinema);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Xóa rạp thành công!" });
    }
}
