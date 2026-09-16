using Microsoft.AspNetCore.Mvc;

namespace MovieBooking.Areas.Admin.Controllers;

[Area("Admin")]
public class HomeController : Controller
{
    [MovieBooking.Filters.SessionAuthorizeRole("Admin")]
    public IActionResult Index()
    {
        return Content($"Admin Page - UserId: {HttpContext.Session.GetInt32("UserId")}, Role: {HttpContext.Session.GetString("Role")}");
    }
}