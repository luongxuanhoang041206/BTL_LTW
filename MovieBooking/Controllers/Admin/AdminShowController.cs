using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.DTOs.Showtime;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Admin;

public class AdminShowController : AdminBaseController
{
    private readonly IShowtimeService _showtimeService;

    public AdminShowController(IShowtimeService showtimeService) : base()
    {
        _showtimeService = showtimeService;
    }

    public class AddShowRequest
    {
        [Range(1, int.MaxValue)]
        public int MovieId { get; set; }

        [Range(1, int.MaxValue)]
        public int RoomId { get; set; }

        public string? ShowDate { get; set; }

        [JsonPropertyName("date")]
        public string? Date { get; set; }

        public string? StartTime { get; set; }

        [Range(typeof(decimal), "0.01", "99999999.99")]
        public decimal Price { get; set; }

        [Range(typeof(decimal), "0.01", "999.99")]
        public decimal? VipMultiplier { get; set; }
    }

    public class UpdateShowRequest
    {
        public int? MovieId { get; set; }
        public int? RoomId { get; set; }
        public string? ShowDate { get; set; }

        [JsonPropertyName("date")]
        public string? Date { get; set; }
        public string? StartTime { get; set; } = string.Empty;

        [Range(typeof(decimal), "0.01", "99999999.99")]
        public decimal? Price { get; set; }

        [Range(typeof(decimal), "0.01", "999.99")]
        public decimal? VipMultiplier { get; set; }
        public string? Status { get; set; }
    }

    public class ChangeShowtimeStatusRequest
    {
        [Required]
        public string Status { get; set; } = string.Empty;
    }

    [HttpGet("shows")]
    public async Task<IActionResult> GetShows([FromQuery] ShowtimeQueryDto filter)
    {
        var shows = await _showtimeService.GetAdminShowtimesAsync(filter);
        return Ok(shows);
    }

    [HttpPost("shows")]
    [HttpPost("showtimes")]
    public async Task<IActionResult> AddShow([FromBody] AddShowRequest request)
    {
        var result = await _showtimeService.CreateShowtimeAsync(
            request.MovieId, request.RoomId, request.ShowDate ?? request.Date ?? string.Empty,
            request.StartTime ?? string.Empty,
            request.Price, request.VipMultiplier);

        if (!result.Success)
        {
            if (result.Error is "Không tìm thấy phim." or "Không tìm thấy phòng chiếu.")
                return NotFound(new { message = result.Error });
            if (result.Error?.Contains("trùng", StringComparison.OrdinalIgnoreCase) == true)
                return Conflict(new { message = result.Error });
            return BadRequest(new { message = result.Error });
        }

        return Ok(new { success = true, message = "Thêm suất chiếu thành công!", showtimeId = result.ShowtimeId });
    }

    [HttpPatch("shows/{id}")]
    [HttpPut("showtimes/{id}")]
    public async Task<IActionResult> UpdateShow(int id, [FromBody] UpdateShowRequest request)
    {
        var result = await _showtimeService.UpdateShowtimeAsync(
            id, request.MovieId, request.RoomId, request.ShowDate ?? request.Date, request.StartTime,
            request.Price, request.VipMultiplier, request.Status);

        if (!result.Success)
        {
            if (result.Error == "Không tìm thấy suất chiếu.")
                return NotFound(new { message = result.Error });
            if (result.Error is "Không tìm thấy phim." or "Không tìm thấy phòng chiếu.")
                return NotFound(new { message = result.Error });
            if (result.Error?.Contains("trùng", StringComparison.OrdinalIgnoreCase) == true ||
                result.Error?.Contains("đã có", StringComparison.OrdinalIgnoreCase) == true ||
                result.Error?.Contains("đang được giữ", StringComparison.OrdinalIgnoreCase) == true)
                return Conflict(new { message = result.Error });
            return BadRequest(new { message = result.Error });
        }

        return Ok(new { success = true, message = "Cập nhật suất chiếu thành công!" });
    }

    [HttpPatch("showtimes/{id}/status")]
    public async Task<IActionResult> ChangeShowtimeStatus(int id, [FromBody] ChangeShowtimeStatusRequest request)
    {
        var result = await _showtimeService.ChangeShowtimeStatusAsync(id, request.Status);
        return ShowtimeLifecycleResponse(result);
    }

    [HttpPatch("showtimes/{id}/cancel")]
    public async Task<IActionResult> CancelShowtime(int id)
    {
        var result = await _showtimeService.CancelShowtimeAsync(id);
        return ShowtimeLifecycleResponse(result);
    }

    [HttpPatch("showtimes/{id}/complete")]
    public async Task<IActionResult> CompleteShowtime(int id)
    {
        var result = await _showtimeService.CompleteShowtimeAsync(id);
        return ShowtimeLifecycleResponse(result);
    }

    private IActionResult ShowtimeLifecycleResponse((bool Success, string? Error) result)
    {
        if (result.Success)
            return Ok(new
            {
                success = true,
                message = result.Error ?? "Cập nhật vòng đời suất chiếu thành công.",
                requiresManualRefund = result.Error != null
            });

        if (result.Error == "Không tìm thấy suất chiếu.")
            return NotFound(new { success = false, message = result.Error });
        if (result.Error?.Contains("không hợp lệ", StringComparison.OrdinalIgnoreCase) == true)
            return BadRequest(new { success = false, message = result.Error });

        return Conflict(new { success = false, message = result.Error });
    }

    [HttpDelete("shows/{id}")]
    [HttpDelete("showtimes/{id}")]
    public async Task<IActionResult> DeleteShow(int id)
    {
        var result = await _showtimeService.DeleteShowtimeAsync(id);
        if (!result.Success)
        {
            if (result.Error == "Không tìm thấy suất chiếu.")
                return NotFound(new { message = result.Error });
            if (result.Error?.Contains("Không thể xóa", StringComparison.OrdinalIgnoreCase) == true)
                return Conflict(new { message = result.Error });
            return BadRequest(new { message = result.Error });
        }

        return Ok(new { success = true, message = "Xóa suất chiếu thành công!" });
    }

    // detail showtime
    [HttpGet("showtimes/{id}")]
    public async Task<IActionResult> GetShowtimeById(int id)
    {
        if (id <= 0)
        {
            return BadRequest(new
            {
                message = "Invalid showtime ID"
            });
        }

        var showtime = await _showtimeService.GetShowtimeByIdAsync(id);

        if (showtime == null)
        {
            return NotFound(new
            {
                message = "Showtime not found"
            });
        }

        return Ok(showtime);
    }

    [HttpGet("showtimes/calendar")]
    public async Task<IActionResult> GetCalendar(
    [FromQuery] ShowtimeCalendarQueryDto filter)
    {
        if (!filter.StartDate.HasValue || !filter.EndDate.HasValue)
        {
            return BadRequest(new
            {
                message = "StartDate and EndDate are required."
            });
        }

        if (filter.StartDate.Value > filter.EndDate.Value)
        {
            return BadRequest(new
            {
                message = "StartDate cannot be greater than EndDate."
            });
        }

        if ((filter.EndDate.Value.DayNumber -
             filter.StartDate.Value.DayNumber) > 30)
        {
            return BadRequest(new
            {
                message = "Calendar date range cannot exceed 31 days."
            });
        }

        if (filter.CinemaId <= 0 && filter.CinemaId.HasValue ||
            filter.RoomId <= 0 && filter.RoomId.HasValue ||
            filter.MovieId <= 0 && filter.MovieId.HasValue)
        {
            return BadRequest(new
            {
                message = "Invalid filter ID."
            });
        }

        var result = await _showtimeService.GetCalendarAsync(filter);

        return Ok(result);
    }
}
