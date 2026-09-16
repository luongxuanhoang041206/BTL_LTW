using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.Models;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Api;

[ApiController]
[Route("api/movies")]
public class ApiMovieController : ControllerBase
{
    private readonly IMovieService _movieService;
    private readonly IBookingService _bookingService;

    public ApiMovieController(IMovieService movieService, IBookingService bookingService)
    {
        _movieService = movieService;
        _bookingService = bookingService;
    }

    private static object MapMovie(Movie m) => new
    {
        id = m.MovieId,
        title = m.Title,
        description = m.Description,
        duration = m.Duration,
        releaseDate = m.ReleaseDate?.ToString("yyyy-MM-dd"),
        endDate = m.EndDate?.ToString("yyyy-MM-dd"),
        posterUrl = m.PosterUrl,
        trailerUrl = m.TrailerUrl,
        director = m.Director,
        actors = m.Actors,
        language = m.Language,
        ageRating = m.AgeRating,
        status = m.Status,
        genres = m.Genres?.Select(g => new { id = g.GenreId, name = g.GenreName }).ToList() ?? new()
    };

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status,
        [FromQuery] string? genre,
        [FromQuery] string? search,
        [FromQuery] int page = 1)
    {
        var movies = await _movieService.GetAllMoviesAsync(status, genre, search, page);
        return Ok(movies.Select(MapMovie));
    }

    [HttpGet("now-showing")]
    public async Task<IActionResult> GetNowShowing()
    {
        var movies = await _movieService.GetNowShowingMoviesAsync();
        return Ok(movies.Select(MapMovie));
    }

    [HttpGet("coming-soon")]
    public async Task<IActionResult> GetComingSoon()
    {
        var movies = await _movieService.GetComingSoonMoviesAsync();
        return Ok(movies.Select(MapMovie));
    }

    [HttpGet("genres")]
    public async Task<IActionResult> GetGenres()
    {
        var genres = await _movieService.GetAllGenresAsync();
        return Ok(genres.Select(g => new { id = g.GenreId, name = g.GenreName }));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var movie = await _movieService.GetMovieByIdAsync(id);
        if (movie == null)
        {
            return NotFound(new { message = "Không tìm thấy phim." });
        }

        return Ok(MapMovie(movie));
    }

    [HttpGet("{id}/showtimes")]
    public async Task<IActionResult> GetShowtimes(int id)
    {
        var selection = await _bookingService.GetShowtimeSelectionAsync(id);
        if (selection == null)
        {
            return NotFound(new { message = "Không tìm thấy lịch chiếu cho phim này." });
        }

        return Ok(selection);
    }
}
