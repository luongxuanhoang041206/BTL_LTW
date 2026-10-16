using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.DTOs;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Areas.Admin.Controllers;

[Area("Admin")]
public class MovieController : Controller
{
    private readonly IMovieService _movieService;

    public MovieController(IMovieService movieService)
    {
        _movieService = movieService;
    }

    [HttpGet]
    public IActionResult Index()
    {
        return RedirectToAction("Index", "Movie", new { area = "" });
    }

    [MovieBooking.Filters.SessionAuthorizeRole("Admin")]
    [HttpGet]
    public async Task<IActionResult> Create()
    {
        ViewBag.Genres = await _movieService.GetAllGenresAsync();
        return View("~/Views/Movie/Create.cshtml", new MovieFormDto { Status = "Coming Soon" });
    }

    [MovieBooking.Filters.SessionAuthorizeRole("Admin")]
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(MovieFormDto model)
    {
        if (!ModelState.IsValid)
        {
            ViewBag.Genres = await _movieService.GetAllGenresAsync();
            return View("~/Views/Movie/Create.cshtml", model);
        }

<<<<<<< HEAD
        if (await _movieService.MovieTitleExistsAsync(model.Title))
        {
            ModelState.AddModelError(nameof(model.Title), "Tên phim này đã tồn tại.");
            ViewBag.Genres = await _movieService.GetAllGenresAsync();
            return View("~/Views/Movie/Create.cshtml", model);
        }

=======
>>>>>>> main
        var movie = await _movieService.CreateMovieAsync(model);
        TempData["Success"] = "Tạo phim mới thành công.";
        return RedirectToAction("Details", "Movie", new { area = "", id = movie.MovieId });
    }

    [MovieBooking.Filters.SessionAuthorizeRole("Admin")]
    [HttpGet]
    public async Task<IActionResult> Edit(int id)
    {
<<<<<<< HEAD
        var movie = await _movieService.GetMovieByIdAsync(id, includeExpired: true);
=======
        var movie = await _movieService.GetMovieByIdAsync(id);
>>>>>>> main
        if (movie == null)
        {
            return NotFound();
        }

        var model = new MovieFormDto
        {
            MovieId = movie.MovieId,
            Title = movie.Title,
            Description = movie.Description,
            Duration = movie.Duration,
            ReleaseDate = movie.ReleaseDate,
            EndDate = movie.EndDate,
            PosterUrl = movie.PosterUrl,
            TrailerUrl = movie.TrailerUrl,
            Director = movie.Director,
            Actors = movie.Actors,
            Language = movie.Language,
            AgeRating = movie.AgeRating,
            Status = movie.Status,
            GenreIds = movie.Genres.Select(g => g.GenreId).ToList()
        };

        ViewBag.Genres = await _movieService.GetAllGenresAsync();
        return View("~/Views/Movie/Edit.cshtml", model);
    }

    [MovieBooking.Filters.SessionAuthorizeRole("Admin")]
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int id, MovieFormDto model)
    {
        if (!ModelState.IsValid)
        {
            ViewBag.Genres = await _movieService.GetAllGenresAsync();
            return View("~/Views/Movie/Edit.cshtml", model);
        }

<<<<<<< HEAD
        if (await _movieService.MovieTitleExistsAsync(model.Title, id))
        {
            ModelState.AddModelError(nameof(model.Title), "Tên phim này đã được sử dụng bởi phim khác.");
            ViewBag.Genres = await _movieService.GetAllGenresAsync();
            return View("~/Views/Movie/Edit.cshtml", model);
        }

=======
>>>>>>> main
        if (!await _movieService.UpdateMovieAsync(id, model))
        {
            return NotFound();
        }

        TempData["Success"] = "Cập nhật phim thành công.";
        return RedirectToAction("Details", "Movie", new { area = "", id });
    }

    [MovieBooking.Filters.SessionAuthorizeRole("Admin")]
    [HttpGet]
    public async Task<IActionResult> Delete(int id)
    {
<<<<<<< HEAD
        var movie = await _movieService.GetMovieByIdAsync(id, includeExpired: true);
=======
        var movie = await _movieService.GetMovieByIdAsync(id);
>>>>>>> main
        return movie == null
            ? NotFound()
            : View("~/Views/Movie/Delete.cshtml", movie);
    }

    [MovieBooking.Filters.SessionAuthorizeRole("Admin")]
    [HttpPost, ActionName("Delete")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteConfirmed(int id)
    {
        if (!await _movieService.DeleteMovieAsync(id))
        {
            return NotFound();
        }

        TempData["Success"] = "Xóa phim thành công.";
        return RedirectToAction("Index", "Movie", new { area = "" });
    }
<<<<<<< HEAD
}
=======
}
>>>>>>> main
