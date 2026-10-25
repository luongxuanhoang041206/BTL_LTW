using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.DTOs;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Admin;

public class AdminMovieController : AdminBaseController
{
    private readonly IMovieService _movieService;

    public AdminMovieController(MovieBookingContext context, IMovieService movieService) : base(context)
    {
        _movieService = movieService;
    }

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
