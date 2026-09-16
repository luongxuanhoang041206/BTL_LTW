using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.Models;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers;

public class MovieController : Controller
{
    private readonly IMovieService _movieService;

    public MovieController(IMovieService movieService)
    {
        _movieService = movieService;
    }

    [MovieBooking.Filters.SessionAuthorize]
    public async Task<IActionResult> Index(
        string? status,
        string? genre,
        string? search,
        int page = 1
    )
    {
        var movies = await _movieService.GetAllMoviesAsync(status, genre, search, page);
        return View(movies);
    }

    [MovieBooking.Filters.SessionAuthorize]
    public async Task<IActionResult> NowShowing()
    {
        var movies = await _movieService.GetNowShowingMoviesAsync();
        ViewBag.Title = "Phim Đang Chiếu";
        return View("Index", movies);
    }

    [MovieBooking.Filters.SessionAuthorize]
    public async Task<IActionResult> ComingSoon()
    {
        var movies = await _movieService.GetComingSoonMoviesAsync();
        ViewBag.Title = "Phim Sắp Chiếu";
        return View("Index", movies);
    }

    [MovieBooking.Filters.SessionAuthorize]
    public async Task<IActionResult> Details(int id)
    {
        var movie = await _movieService.GetMovieByIdAsync(id);
        if (movie == null)
        {
            return NotFound();
        }

        return View(movie);
    }

}
