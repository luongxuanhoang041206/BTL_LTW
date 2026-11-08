using Microsoft.AspNetCore.Mvc;
using MovieBooking.DTOs;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Admin;

public class AdminSystemController(IAdminSystemService systemService, ISystemSettingsService settingsService) : AdminBaseController
{
    [HttpGet("system/users")]
    public async Task<IActionResult> GetStaffUsers()
        => Ok(await systemService.GetStaffUsersAsync());

    [HttpPost("system/users")]
    public async Task<IActionResult> CreateStaffUser([FromBody] StaffUserFormDto request)
    {
        var result = await systemService.CreateStaffUserAsync(request);
        if (result.Error == "NameOrEmailRequired") return BadRequest(new { message = "Họ tên và Email không được để trống." });
        if (result.Error == "PasswordTooShort") return BadRequest(new { message = "Mật khẩu phải có ít nhất 6 ký tự." });
        if (result.Error == "EmailExists") return Conflict(new { message = "Email này đã được sử dụng." });
        return Ok(new { success = true, message = "Tạo tài khoản quản trị thành công!", id = result.Id });
    }

    [HttpPut("system/users/{id}")]
    public async Task<IActionResult> UpdateStaffUser(int id, [FromBody] StaffUserFormDto request)
    {
        if (!await systemService.UpdateStaffUserAsync(id, request))
            return NotFound(new { message = "Không tìm thấy người dùng." });
        return Ok(new { success = true, message = "Cập nhật tài khoản thành công!" });
    }

    [HttpGet("system/settings")]
    public async Task<IActionResult> GetSystemSettings()
        => Ok(await settingsService.GetAsync());

    [HttpPost("system/settings")]
    public async Task<IActionResult> UpdateSystemSettings([FromBody] SystemSettingsDto settings)
    {
        if (settings == null) return BadRequest(new { message = "Dữ liệu cấu hình không hợp lệ." });
        var (updated, error) = await settingsService.UpdateAsync(settings, HttpContext.Session.GetInt32("UserId"));
        if (error != null) return BadRequest(new { message = error });
        return Ok(new { success = true, message = "Đã lưu cấu hình hệ thống thành công!", settings = updated });
    }
}
