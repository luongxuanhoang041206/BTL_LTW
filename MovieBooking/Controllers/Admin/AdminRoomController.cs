using Microsoft.AspNetCore.Mvc;
using MovieBooking.DTOs;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Admin;

public class AdminRoomController(IRoomService roomService) : AdminBaseController
{
    [HttpGet("rooms")]
    public async Task<IActionResult> GetRooms([FromQuery] int? cinemaId)
        => Ok(await roomService.GetRoomsAsync(cinemaId));

    [HttpPost("rooms")]
    public async Task<IActionResult> CreateRoom([FromBody] RoomFormDto request)
    {
        var result = await roomService.CreateRoomAsync(request);
        if (result.Error == "EmptyRoomName") return BadRequest(new { message = "Tên phòng chiếu không được để trống." });
        if (result.Error == "CinemaNotFound") return BadRequest(new { message = "Không tìm thấy rạp tương ứng." });
        return Ok(new { success = true, message = "Thêm phòng chiếu thành công!", id = result.Id });
    }

    [HttpPut("rooms/{id}")]
    public async Task<IActionResult> UpdateRoom(int id, [FromBody] RoomFormDto request)
    {
        var error = await roomService.UpdateRoomAsync(id, request);
        if (error == "NotFound") return NotFound(new { message = "Không tìm thấy phòng chiếu." });
        if (error == "EmptyRoomName") return BadRequest(new { message = "Tên phòng không được để trống." });
        return Ok(new { success = true, message = "Cập nhật phòng chiếu thành công!" });
    }

    [HttpDelete("rooms/{id}")]
    public async Task<IActionResult> DeleteRoom(int id)
    {
        var error = await roomService.DeleteRoomAsync(id);
        if (error == "NotFound") return NotFound(new { message = "Không tìm thấy phòng chiếu." });
        if (error == "ActiveShowtimes") return BadRequest(new { message = "Không thể xóa phòng chiếu đang có suất chiếu hoạt động." });
        return Ok(new { success = true, message = "Xóa phòng chiếu thành công!" });
    }
}
