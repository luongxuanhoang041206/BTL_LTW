using Microsoft.AspNetCore.Mvc;
using MovieBooking.DTOs.Cinema;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Admin;

public class AdminCinemaController : AdminBaseController
{
    private readonly ICinemaService _cinemaService;

    public AdminCinemaController(ICinemaService cinemaService) : base()
    {
        _cinemaService = cinemaService;
    }

    [HttpGet("cinemas")]
    public async Task<IActionResult> GetCinemas(
       [FromQuery] CinemaQueryDto filter )
    {
        var cinemas = await _cinemaService.GetAdminCinemasAsync(filter);

        return Ok(cinemas);
    }

    [HttpPost("cinemas")]
    public async Task<IActionResult> CreateCinema([FromBody] CinemaRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Tên rạp không được để trống." });

        var cinema = await _cinemaService.CreateCinemaAsync(request);

        return Ok(new { success = true, message = "Thêm rạp chiếu phim thành công!", id = cinema.CinemaId });
    }

    [HttpPut("cinemas/{id}")]
    public async Task<IActionResult> UpdateCinema(int id, [FromBody] CinemaRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Tên rạp không được để trống." });

        var cinema = await _cinemaService.UpdateCinemaAsync(id, request);
        if (cinema == null) return NotFound(new { message = "Không tìm thấy rạp chiếu." });

        return Ok(new { success = true, message = "Cập nhật thông tin rạp thành công!" });
    }

    [HttpDelete("cinemas/{id}")]
    public async Task<IActionResult> DeleteCinema(int id)
    {
        var (success, error, roomCount) = await _cinemaService.DeleteCinemaAsync(id);
        if (!success && error == "NotFound")
            return NotFound(new { message = "Không tìm thấy rạp chiếu." });

        if (!success && error == "HasRooms")
            return BadRequest(new { message = $"Không thể xóa rạp vì đang có {roomCount} phòng chiếu. Vui lòng chuyển hoặc xóa phòng trước." });

        return Ok(new { success = true, message = "Xóa rạp thành công!" });
    }

    [HttpGet("cinemas/{id:int}")]
    public async Task<IActionResult> GetCinemaDetail(int id)
    {
        var cinema = await _cinemaService.GetAdminCinemaDetailAsync(id);

        if(cinema == null)
        {
            return NotFound(new
            {
                message = "Cinema not found"
            });
        }
        return Ok(cinema);
    }
}
