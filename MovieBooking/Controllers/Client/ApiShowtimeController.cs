using Microsoft.AspNetCore.Mvc;
using MovieBooking.DTOs.Showtime;
using MovieBooking.Filters;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Client;

[ApiController]
[Route("api/admin/showtimes")]
[SessionAuthorizeRole("Admin")]
public class ApiShowtimeController : ControllerBase
{
    private readonly IShowtimeService _showtimeService;

    public ApiShowtimeController(IShowtimeService showtimeService)
    {
        _showtimeService = showtimeService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] ShowtimeQueryDto filter)
    {
        return Ok(await _showtimeService.GetAdminShowtimesAsync(filter));
    }
}
