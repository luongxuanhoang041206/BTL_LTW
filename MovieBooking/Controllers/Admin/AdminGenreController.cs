using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Models;

namespace MovieBooking.Controllers.Admin;

public class AdminGenreController : AdminBaseController
{
    public AdminGenreController(MovieBookingContext context) : base(context) { }

    public class GenreRequest { public string Name { get; set; } = string.Empty; }

    [HttpGet("genres")]
    public async Task<IActionResult> GetGenres()
    {
        var genres = await _context.Genres
            .AsNoTracking()
            .Select(g => new
            {
                id = g.GenreId,
                name = g.GenreName,
                movieCount = g.Movies.Count
            })
            .OrderBy(g => g.name)
            .ToListAsync();

        return Ok(genres);
    }

    [HttpPost("genres")]
    public async Task<IActionResult> CreateGenre([FromBody] GenreRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Tên thể loại không được để trống." });

        var trimmed = request.Name.Trim();
        if (await _context.Genres.AnyAsync(g => g.GenreName.ToLower() == trimmed.ToLower()))
            return Conflict(new { message = "Thể loại phim này đã tồn tại." });

        var genre = new Genre { GenreName = trimmed };
        _context.Genres.Add(genre);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Thêm thể loại thành công!", id = genre.GenreId, name = genre.GenreName });
    }

    [HttpPut("genres/{id}")]
    public async Task<IActionResult> UpdateGenre(int id, [FromBody] GenreRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Tên thể loại không được để trống." });

        var genre = await _context.Genres.FindAsync(id);
        if (genre == null) return NotFound(new { message = "Không tìm thấy thể loại." });

        var trimmed = request.Name.Trim();
        if (await _context.Genres.AnyAsync(g => g.GenreName.ToLower() == trimmed.ToLower() && g.GenreId != id))
            return Conflict(new { message = "Tên thể loại đã được sử dụng." });

        genre.GenreName = trimmed;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Cập nhật thể loại thành công!" });
    }

    [HttpDelete("genres/{id}")]
    public async Task<IActionResult> DeleteGenre(int id)
    {
        var genre = await _context.Genres.Include(g => g.Movies).FirstOrDefaultAsync(g => g.GenreId == id);
        if (genre == null) return NotFound(new { message = "Không tìm thấy thể loại." });

        if (genre.Movies.Count > 0)
            return BadRequest(new { message = $"Không thể xóa thể loại vì đang có {genre.Movies.Count} phim liên kết." });

        _context.Genres.Remove(genre);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Xóa thể loại thành công!" });
    }
}
