using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using System.IO;
using System.ComponentModel.DataAnnotations;
using System.Globalization;
using MovieBooking.DTOs;
using MovieBooking.Models;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Admin;

public class AdminMovieController : AdminBaseController
{
    private const long MaxPosterBytes = 5 * 1024 * 1024;
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
    public async Task<IActionResult> CreateMovie([FromForm] IFormCollection form)
    {
        if (!IsAdmin())
        {
            return Unauthorized(new { message = "Bạn cần đăng nhập bằng tài khoản Admin." });
        }

        var (model, posterFile, bindingError) = BindMovieForm(form);
        if (bindingError != null) return BadRequest(new { message = bindingError });

        var uploadError = ValidatePoster(posterFile);
        if (uploadError != null) return BadRequest(new { message = uploadError });

        if (!TryValidateModel(model))
        {
            var errors = ModelState.Values.SelectMany(value => value.Errors)
                .Select(error => error.ErrorMessage).Where(message => !string.IsNullOrWhiteSpace(message));
            return BadRequest(new { message = string.Join(" ", errors) });
        }

        if (await _movieService.MovieTitleExistsAsync(model.Title))
        {
            return Conflict(new { message = "Tên phim này đã tồn tại." });
        }

        var posterPath = await SavePosterAsync(posterFile);
        if (posterPath != null) model.PosterUrl = posterPath;

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
    public async Task<IActionResult> UpdateMovie(int id, [FromForm] IFormCollection form)
    {
        if (!IsAdmin())
        {
            return Unauthorized(new { message = "Bạn cần đăng nhập bằng tài khoản Admin." });
        }

        var (model, posterFile, bindingError) = BindMovieForm(form);
        if (bindingError != null) return BadRequest(new { message = bindingError });

        var uploadError = ValidatePoster(posterFile);
        if (uploadError != null) return BadRequest(new { message = uploadError });

        if (!TryValidateModel(model))
        {
            var errors = ModelState.Values.SelectMany(value => value.Errors)
                .Select(error => error.ErrorMessage).Where(message => !string.IsNullOrWhiteSpace(message));
            return BadRequest(new { message = string.Join(" ", errors) });
        }

        if (await _movieService.MovieTitleExistsAsync(model.Title, id))
        {
            return Conflict(new { message = "Tên phim này đã được sử dụng bởi phim khác." });
        }

        if (posterFile != null)
        {
            var posterPath = await SavePosterAsync(posterFile);
            if (posterPath != null) model.PosterUrl = posterPath;
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

    private static (MovieFormDto Model, IFormFile? Poster, string? Error) BindMovieForm(IFormCollection form)
    {
        var model = new MovieFormDto
        {
            Title = FormValue(form, "Title"),
            Description = FormValue(form, "Description"),
            TrailerUrl = FormValue(form, "TrailerUrl"),
            Director = FormValue(form, "Director"),
            Actors = FormValue(form, "Actors"),
            Language = FormValue(form, "Language"),
            AgeRating = FormValue(form, "AgeRating"),
            Status = FormValue(form, "Status"),
            PosterUrl = FormValue(form, "PosterUrl"),
            GenreIds = FormValue(form, "GenreIds")
        };

        var ageRatingInput = model.AgeRating?.Trim().ToUpperInvariant();
        model.AgeRating = ageRatingInput switch
        {
            null or "" => "C18",
            "P" or "C13" or "C16" or "C18" => ageRatingInput,
            "13" => "C13",
            "16" => "C16",
            "18" => "C18",
            _ => null
        };
        if (model.AgeRating == null)
            return (model, form.Files.GetFile("PosterFile"), "Độ tuổi phải là P, C13, C16 hoặc C18.");

        if (!int.TryParse(FormValue(form, "Duration"), NumberStyles.Integer, CultureInfo.InvariantCulture, out var duration))
            return (model, form.Files.GetFile("PosterFile"), "Thời lượng phim không hợp lệ.");
        model.Duration = duration;

        if (!TryParseDate(FormValue(form, "ReleaseDate"), out var releaseDate) ||
            !TryParseDate(FormValue(form, "EndDate"), out var endDate))
            return (model, form.Files.GetFile("PosterFile"), "Ngày khởi chiếu hoặc ngày kết thúc không hợp lệ.");
        model.ReleaseDate = releaseDate;
        model.EndDate = endDate;

        return (model, form.Files.GetFile("PosterFile"), null);
    }

    private static string FormValue(IFormCollection form, string key)
        => form.TryGetValue(key, out var value) ? value.ToString() : string.Empty;

    private static bool TryParseDate(string value, out DateOnly? date)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            date = null;
            return true;
        }

        if (DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
        {
            date = parsed;
            return true;
        }

        date = null;
        return false;
    }

    private static string? ValidatePoster(IFormFile? posterFile)
    {
        if (posterFile == null) return null;
        if (posterFile.Length == 0) return "Tệp ảnh rỗng.";
        if (posterFile.Length > MaxPosterBytes) return "Ảnh poster không được vượt quá 5 MB.";

        var extension = Path.GetExtension(posterFile.FileName).ToLowerInvariant();
        var validTypes = new Dictionary<string, string>
        {
            [".jpg"] = "image/jpeg", [".jpeg"] = "image/jpeg",
            [".png"] = "image/png", [".webp"] = "image/webp"
        };
        if (!validTypes.TryGetValue(extension, out var expectedType) ||
            !string.Equals(posterFile.ContentType, expectedType, StringComparison.OrdinalIgnoreCase))
        {
            return "Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.";
        }

        return null;
    }

    private async Task<string?> SavePosterAsync(IFormFile? posterFile)
    {
        if (posterFile == null) return null;

        var extension = Path.GetExtension(posterFile.FileName).ToLowerInvariant();
        var uploadDirectory = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "movies");
        Directory.CreateDirectory(uploadDirectory);

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(uploadDirectory, fileName);
        await using var stream = System.IO.File.Create(filePath);
        await posterFile.CopyToAsync(stream);
        return $"/uploads/movies/{fileName}";
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
