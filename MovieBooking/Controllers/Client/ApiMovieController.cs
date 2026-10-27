using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.Data;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Models;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Client;

[ApiController]
[Route("api/movies")]
public class ApiMovieController : ControllerBase
{
    private readonly IMovieService _movieService;
    private readonly IBookingService _bookingService;
    private readonly IGenreService _genreService;
    private readonly MovieBookingContext _context;

    public ApiMovieController(
        IMovieService movieService,
        IBookingService bookingService,
        IGenreService genreService,
        MovieBookingContext context)
    {
        _movieService = movieService;
        _bookingService = bookingService;
        _genreService = genreService;
        _context = context;
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
    public async Task<IActionResult> GetGenres([FromQuery] string? search = null)
    {
        var genres = await _genreService.GetAllGenresAsync(search);
        return Ok(genres.Select(g => new { id = g.GenreId, name = g.Name, movieCount = g.MovieCount }));
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

    [HttpGet("{id}/cinemas")]
    public async Task<IActionResult> GetCinemasForMovie(int id)
    {
        var cinemas = await _bookingService.GetCinemasForMovieAsync(id);
        return Ok(cinemas);
    }

    [HttpGet("{id}/showtimes")]
    public async Task<IActionResult> GetShowtimes(int id, [FromQuery] int? cinemaId, [FromQuery] DateOnly? date, [FromQuery] string? city, [FromQuery] string? roomType)
    {
        var selection = await _bookingService.GetShowtimeSelectionAsync(id, cinemaId, date, city, roomType);
        if (selection == null)
        {
            return NotFound(new { message = "Không tìm thấy lịch chiếu cho phim này." });
        }

        return Ok(selection);
    }

    [HttpGet("{id}/showtimes/dates")]
    public async Task<IActionResult> GetShowtimeDates(int id)
    {
        var movieExists = await _context.Movies.AsNoTracking().AnyAsync(m => m.MovieId == id);
        if (!movieExists) return NotFound(new { message = "Không tìm thấy phim." });

        var now = DateTime.Now;
        var today = DateOnly.FromDateTime(now);
        var currentTime = TimeOnly.FromDateTime(now);
        var dates = await _context.Showtimes.AsNoTracking()
            .Where(s => s.MovieId == id && s.Status == "Active"
                && (s.ShowDate > today || (s.ShowDate == today && s.EndTime > currentTime)))
            .Select(s => s.ShowDate)
            .Distinct()
            .OrderBy(d => d)
            .ToListAsync();

        return Ok(new { movieId = id, dates = dates.Select(d => new { date = d.ToString("yyyy-MM-dd"), hasShowtimes = true }) });
    }
}
