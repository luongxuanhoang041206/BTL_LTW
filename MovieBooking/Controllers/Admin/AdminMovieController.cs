using Microsoft.AspNetCore.Mvc;
using MovieBooking.DTOs;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Admin;

public class AdminMovieController : AdminBaseController
{
    private readonly IMovieService _movieService;

    public AdminMovieController(IMovieService movieService) : base()
    {
        _movieService = movieService;
    }

    [HttpGet("movies")]
    public async Task<IActionResult> GetMovies([FromQuery] int page = 1, [FromQuery] string? search = null)
    {
        if (!IsAdmin())
        {
            return Unauthorized(new { message = "Bạn cần đăng nhập bằng tài khoản Admin." });
        }

        page = Math.Max(1, page);
        return Ok(await _movieService.GetAdminMovieResponsesAsync(search, page));
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search(
        [FromQuery] string? search, [FromQuery] int page = 1)
    {
        return await GetMovies(page, search);


    }

    [HttpGet("movies/{id}")]
    public async Task<IActionResult> GetMovie(int id)
    {
        if (!IsAdmin())
        {
            return Unauthorized(new { message = "Bạn cần đăng nhập bằng tài khoản Admin." });
        }

        var movie = await _movieService.GetAdminMovieResponseByIdAsync(id);
        if (movie == null) return NotFound(new { message = "Không tìm thấy phim." });
        return Ok(movie);
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

        if (!await _movieService.MovieExistsAsync(id))
        {
            return NotFound(new { message = "Không tìm thấy phim." });
        }

        if (await _movieService.HasShowtimesOrReviewsAsync(id))
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
