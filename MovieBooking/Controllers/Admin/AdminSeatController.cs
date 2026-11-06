using Microsoft.AspNetCore.Mvc;
using MovieBooking.DTOs;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Admin;

public class AdminSeatController(ISeatService seatService) : AdminBaseController
{
    [HttpGet("rooms/{roomId}/seats")]
    public async Task<IActionResult> GetRoomSeats(int roomId)
    {
        var seatMap = await seatService.GetRoomSeatsAsync(roomId);
        if (seatMap == null) return NotFound(new { message = "Không tìm thấy phòng chiếu." });
        return Ok(new
        {
            roomId = seatMap.RoomId,
            roomName = seatMap.RoomName,
            roomType = seatMap.RoomType,
            cinemaName = seatMap.CinemaName,
            seats = seatMap.Seats.Select(seat => new
            {
                id = seat.Id,
                row = seat.Row,
                number = seat.Number,
                type = seat.Type,
                isActive = seat.IsActive
            })
        });
    }

    [HttpPost("rooms/{roomId}/seats/batch-generate")]
    public async Task<IActionResult> BatchGenerateSeats(int roomId, [FromBody] BatchSeatRequestDto request)
    {
        var result = await seatService.GenerateSeatsAsync(roomId, request);
        if (result.Error == "NotFound") return NotFound(new { message = "Không tìm thấy phòng chiếu." });
        if (result.Error == "HasShowtimes")
            return BadRequest(new { message = "Phòng chiếu đã được xếp suất chiếu, không thể khởi tạo lại toàn bộ sơ đồ ghế." });
        return Ok(new { success = true, message = $"Đã tạo sơ đồ gồm {result.SeatCount} ghế cho phòng {result.RoomName}!" });
    }

    [HttpPatch("seats/{seatId}/toggle")]
    public async Task<IActionResult> ToggleSeatStatus(int seatId)
    {
        var seat = await seatService.ToggleSeatStatusAsync(seatId);
        if (seat == null) return NotFound(new { message = "Không tìm thấy ghế." });
        return Ok(new { success = true, seatId = seat.SeatId, isActive = seat.IsActive });
    }

    [HttpPatch("seats/{seatId}/type")]
    public async Task<IActionResult> ChangeSeatType(int seatId, [FromBody] UpdateSeatRequestDto request)
    {
        var seat = await seatService.UpdateSeatAsync(seatId, request);
        if (seat == null) return NotFound(new { message = "Không tìm thấy ghế." });
        return Ok(new { success = true, seatId = seat.SeatId, seatType = seat.SeatType, isActive = seat.IsActive });
    }
}
