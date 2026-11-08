using Microsoft.AspNetCore.Mvc;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Client;

/// <summary>Cấu hình vận hành công khai (không nhạy cảm) cho frontend client.</summary>
[ApiController]
[Route("api/system")]
public class ApiSystemController(ISystemSettingsService settingsService) : ControllerBase
{
    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
        => Ok(await settingsService.GetAsync());
}