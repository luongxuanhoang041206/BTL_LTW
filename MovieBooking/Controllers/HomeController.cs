using Microsoft.AspNetCore.Mvc;
using MovieBooking.Models;
using System.Diagnostics;

namespace MovieBooking.Controllers
{
    public class HomeController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [MovieBooking.Filters.SessionAuthorize]
        public IActionResult Profile()
        {
            return Content($"UserId: {HttpContext.Session.GetInt32("UserId")}, Role: {HttpContext.Session.GetString("Role")}");
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
