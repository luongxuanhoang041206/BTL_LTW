using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Client;

[ApiController]
[Route("api/cinemas")]
public class ApiCinemaController : ControllerBase
{
    private readonly ICinemaService _cinemaService;

    public ApiCinemaController(ICinemaService cinemaService)
    {
        _cinemaService = cinemaService;
    }

    /// <summary>
    /// Lấy danh sách các rạp chiếu phim trong hệ thống.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var cinemas = await _cinemaService.GetAllCinemasAsync();
        return Ok(cinemas);
    }

    /// <summary>
    /// Lấy thông tin chi tiết một rạp chiếu phim theo CinemaId.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var cinema = await _cinemaService.GetCinemaByIdAsync(id);
        if (cinema == null)
        {
            return NotFound(new { message = "Không tìm thấy rạp chiếu phim." });
        }

        return Ok(cinema);
    }
}
