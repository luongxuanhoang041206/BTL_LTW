using Microsoft.AspNetCore.Mvc;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Client;

[ApiController]
[Route("api/movies")]
public class ApiMovieController : ControllerBase
{
    private readonly IMovieService _movieService;
    private readonly IBookingService _bookingService;
    private readonly IGenreService _genreService;

    public ApiMovieController(
        IMovieService movieService,
        IBookingService bookingService,
        IGenreService genreService)
    {
        _movieService = movieService;
        _bookingService = bookingService;
        _genreService = genreService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status,
        [FromQuery] string? genre,
        [FromQuery] string? search,
        [FromQuery] int page = 1)
    {
        return Ok(await _movieService.GetMovieResponsesAsync(status, genre, search, page));
    }

    [HttpGet("now-showing")]
    public async Task<IActionResult> GetNowShowing()
    {
        return Ok(await _movieService.GetNowShowingMovieResponsesAsync());
    }

    [HttpGet("coming-soon")]
    public async Task<IActionResult> GetComingSoon()
    {
        return Ok(await _movieService.GetComingSoonMovieResponsesAsync());
    }

    [HttpGet("genres")]
    public async Task<IActionResult> GetGenres([FromQuery] string? search = null)
    {
        return Ok(await _genreService.GetGenreResponsesAsync(search));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var movie = await _movieService.GetMovieResponseByIdAsync(id);
        if (movie == null)
        {
            return NotFound(new { message = "Không tìm thấy phim." });
        }

        return Ok(movie);
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
        var dates = await _movieService.GetUpcomingShowtimeDatesAsync(id);
        if (dates == null) return NotFound(new { message = "Không tìm thấy phim." });

        return Ok(new { movieId = id, dates = dates.Select(d => new { date = d.ToString("yyyy-MM-dd"), hasShowtimes = true }) });
    }
}
