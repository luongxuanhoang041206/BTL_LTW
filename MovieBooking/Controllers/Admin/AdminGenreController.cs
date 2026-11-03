using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.Data;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Admin;

public class AdminGenreController : AdminBaseController
{
    private readonly IGenreService _genreService;

    public AdminGenreController(MovieBookingContext context, IGenreService genreService) : base(context)
    {
        _genreService = genreService;
    }

    public class GenreRequest { public string Name { get; set; } = string.Empty; }

    [HttpGet("genres")]
    public async Task<IActionResult> GetGenres([FromQuery] string? search = null, [FromQuery] int? page = 1, [FromQuery] int pageSize = 10)
    {
        page = Math.Max(1, page.Value);
        pageSize = Math.Max(1, pageSize);

        var genres = await _genreService.GetAllGenresAsync(search, page, pageSize);

        return Ok(genres.Select(g => new
        {
            id = g.GenreId,
            name = g.Name,
            movieCount = g.MovieCount
        }));
    }

    [HttpPost("genres")]
    public async Task<IActionResult> CreateGenre([FromBody] GenreRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Tên thể loại không được để trống." });

        var trimmed = request.Name.Trim();
        if (await _genreService.GenreNameExistsAsync(trimmed))
            return Conflict(new { message = "Thể loại phim này đã tồn tại." });

        var genre = await _genreService.CreateGenreAsync(trimmed);
        return Ok(new { success = true, message = "Thêm thể loại thành công!", id = genre.GenreId, name = genre.GenreName });
    }

    [HttpPut("genres/{id}")]
    public async Task<IActionResult> UpdateGenre(int id, [FromBody] GenreRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Tên thể loại không được để trống." });

        var (success, errorMessage) = await _genreService.UpdateGenreAsync(id, request.Name);
        if (!success)
        {
            if (errorMessage == "Không tìm thấy thể loại.")
                return NotFound(new { message = errorMessage });
            return Conflict(new { message = errorMessage });
        }

        return Ok(new { success = true, message = "Cập nhật thể loại thành công!" });
    }

    [HttpDelete("genres/{id}")]
    public async Task<IActionResult> DeleteGenre(int id)
    {
        var (success, errorMessage) = await _genreService.DeleteGenreAsync(id);
        if (!success)
        {
            if (errorMessage == "Không tìm thấy thể loại.")
                return NotFound(new { message = errorMessage });
            return BadRequest(new { message = errorMessage });
        }

        return Ok(new { success = true, message = "Xóa thể loại thành công!" });
    }
}
