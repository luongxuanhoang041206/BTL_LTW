using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.Data;
using MovieBooking.Filters;

namespace MovieBooking.Controllers.Admin;

/// <summary>
/// Base controller cho tất cả Admin API controllers.
/// Cung cấp common helpers: IsAdmin(), VietnamToday, và inject DbContext.
/// </summary>
[ApiController]
[Route("api/admin")]
[SessionAuthorizeRole("Admin")]
public abstract class AdminBaseController : ControllerBase
{
    protected readonly MovieBookingContext _context;

    protected AdminBaseController(MovieBookingContext context)
    {
        _context = context;
    }

    protected bool IsAdmin()
    {
        var role = HttpContext.Session.GetString("Role");
        // Cho phép nếu là Admin, hoặc trong môi trường test/dev nếu cần
        return role == "Admin";
    }

    protected static DateOnly VietnamToday => DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
}
