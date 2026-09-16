using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.DTOs;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Api;

[ApiController]
[Route("api/auth")]
public class ApiAuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public ApiAuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpGet("me")]
    public IActionResult GetCurrentUser()
    {
        var userId = HttpContext.Session.GetInt32("UserId");
        if (userId == null)
        {
            return Ok(new { isAuthenticated = false, user = (object?)null });
        }

        return Ok(new
        {
            isAuthenticated = true,
            user = new
            {
                userId = userId.Value,
                fullName = HttpContext.Session.GetString("FullName"),
                email = HttpContext.Session.GetString("Email"),
                role = HttpContext.Session.GetString("Role")
            }
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginViewModel model)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ." });
        }

        var (success, errorMessage, user) = await _authService.LoginAsync(model.Email, model.Password);
        if (!success || user == null)
        {
            return BadRequest(new { success = false, message = errorMessage ?? "Email hoặc mật khẩu không chính xác." });
        }

        HttpContext.Session.SetInt32("UserId", user.UserId);
        HttpContext.Session.SetString("Role", user.Role);
        HttpContext.Session.SetString("FullName", user.FullName);
        HttpContext.Session.SetString("Email", user.Email);

        return Ok(new
        {
            success = true,
            message = "Đăng nhập thành công!",
            user = new
            {
                userId = user.UserId,
                fullName = user.FullName,
                email = user.Email,
                role = user.Role
            }
        });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterViewModel model)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ." });
        }

        var (success, errorMessage) = await _authService.RegisterAsync(model);
        if (!success)
        {
            return BadRequest(new { success = false, message = errorMessage ?? "Đăng ký thất bại." });
        }

        return Ok(new
        {
            success = true,
            message = "Đăng ký tài khoản thành công! Vui lòng đăng nhập."
        });
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        HttpContext.Session.Clear();
        return Ok(new { success = true, message = "Đã đăng xuất thành công." });
    }
}
