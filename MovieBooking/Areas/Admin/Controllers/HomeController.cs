using Microsoft.AspNetCore.Mvc;

namespace MovieBooking.Areas.Admin.Controllers;

[Area("Admin")]
public class HomeController : Controller
{
    [MovieBooking.Filters.SessionAuthorizeRole("Admin")]
    public IActionResult Index()
    {
        return RedirectToAction("Index", "Movie", new { area = "" });
    }
}