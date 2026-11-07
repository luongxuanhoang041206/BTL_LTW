using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

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
        [FromServices] IWebHostEnvironment environment)
    {
        if (!IsAdmin())
            return Unauthorized(new { message = "Bạn cần đăng nhập bằng tài khoản Admin." });

        if (string.IsNullOrWhiteSpace(folder) || !AllowedFolders.Contains(folder))
            return BadRequest(new { message = "Thư mục lưu ảnh không hợp lệ." });

        if (file == null || file.Length == 0 || file.Length > 5 * 1024 * 1024)
            return BadRequest(new { message = "Ảnh phải có dung lượng dưới 5 MB." });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (extension is not (".jpg" or ".jpeg" or ".png" or ".webp"))
            return BadRequest(new { message = "Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP." });

        var header = new byte[12];
        await using (var input = file.OpenReadStream())
        {
            var read = await input.ReadAsync(header.AsMemory(0, header.Length));
            var isPng = read >= 8 && header.Take(8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 });
            var isJpeg = read >= 3 && header[0] == 255 && header[1] == 216 && header[2] == 255;
            var isWebp = read >= 12 && header.Take(4).SequenceEqual("RIFF"u8.ToArray()) &&
                header.Skip(8).Take(4).SequenceEqual("WEBP"u8.ToArray());
            if (!isPng && !isJpeg && !isWebp)
                return BadRequest(new { message = "File tải lên không phải ảnh hợp lệ." });
        }

        var safeFolder = folder.ToLowerInvariant();
        var webRoot = environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot");
        var uploadDirectory = Path.Combine(webRoot, "uploads", safeFolder);
        Directory.CreateDirectory(uploadDirectory);
        var fileName = $"{Guid.NewGuid():N}{extension}";
        var destination = Path.Combine(uploadDirectory, fileName);
        await using (var output = System.IO.File.Create(destination))
        await using (var input = file.OpenReadStream())
            await input.CopyToAsync(output);

        return Ok(new { url = $"/uploads/{safeFolder}/{fileName}" });
    }
}
