using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.Services;

namespace MovieBooking.Controllers.Admin;

public class AdminUploadController : AdminBaseController
{
    private static readonly HashSet<string> AllowedFolders = new(StringComparer.OrdinalIgnoreCase)
    {
        "posters", "fnb", "banners"
    };

    [HttpPost("uploads")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> Upload(
        [FromForm] IFormFile file,
        [FromQuery] string folder,
        [FromServices] IWebHostEnvironment environment,
        CancellationToken cancellationToken)
    {
        if (!IsAdmin())
            return Unauthorized(new { message = "Bạn cần đăng nhập bằng tài khoản Admin." });

        if (string.IsNullOrWhiteSpace(folder) || !AllowedFolders.Contains(folder))
            return BadRequest(new { message = "Thư mục lưu ảnh không hợp lệ." });

        var prefix = folder.Equals("posters", StringComparison.OrdinalIgnoreCase) ? "movie" : null;
        var saved = await LocalImageStorage.SaveAsync(file, folder, environment, prefix, cancellationToken);
        if (saved.Error != null)
            return BadRequest(new { message = saved.Error });

        return Ok(new { url = saved.Url });
    }
}
