using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace MovieBooking.Services;

public readonly record struct ImageSaveResult(string? Url, string? Error);

/// <summary>
/// Lưu ảnh upload vào wwwroot/uploads và chỉ trả về URL tương đối.
/// </summary>
public static class LocalImageStorage
{
    public const long MaxBytes = 5 * 1024 * 1024;

    public static async Task<ImageSaveResult> SaveAsync(
        IFormFile? file,
        string folder,
        IWebHostEnvironment environment,
        string? namePrefix = null,
        CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length == 0)
            return new ImageSaveResult(null, "Tệp ảnh rỗng.");

        if (file.Length > MaxBytes)
            return new ImageSaveResult(null, "Ảnh không được vượt quá 5 MB.");

        if (string.IsNullOrWhiteSpace(folder) || folder.IndexOfAny(['/', '\\', '.']) >= 0)
            return new ImageSaveResult(null, "Thư mục lưu ảnh không hợp lệ.");

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowedMimes = extension switch
        {
            ".jpg" or ".jpeg" => new[] { "image/jpeg", "image/jpg", "image/pjpeg" },
            ".png" => new[] { "image/png" },
            ".webp" => new[] { "image/webp" },
            _ => Array.Empty<string>()
        };
        if (allowedMimes.Length == 0)
            return new ImageSaveResult(null, "Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.");

        var contentType = (file.ContentType ?? string.Empty).Split(';')[0].Trim().ToLowerInvariant();
        var mimeMissing = string.IsNullOrEmpty(contentType) || contentType == "application/octet-stream";
        if (!mimeMissing && !allowedMimes.Contains(contentType))
            return new ImageSaveResult(null, "Định dạng ảnh không khớp với nội dung file.");

        byte[] content;
        try
        {
            await using var input = file.OpenReadStream();
            using var buffer = new MemoryStream();
            await input.CopyToAsync(buffer, cancellationToken);
            content = buffer.ToArray();
        }
        catch (IOException)
        {
            return new ImageSaveResult(null, "Không đọc được tệp ảnh.");
        }

        if (content.Length == 0 || content.Length > MaxBytes)
            return new ImageSaveResult(null, "Ảnh không được vượt quá 5 MB.");

        if (!MatchesExtension(extension, content))
            return new ImageSaveResult(null, "File tải lên không phải ảnh hợp lệ.");

        var safeFolder = folder.ToLowerInvariant();
        var prefix = string.IsNullOrWhiteSpace(namePrefix) ? string.Empty : $"{namePrefix.Trim().ToLowerInvariant()}_";
        var fileName = $"{prefix}{Guid.NewGuid():N}{extension}";
        var webRoot = environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot");
        var uploadDirectory = Path.Combine(webRoot, "uploads", safeFolder);

        try
        {
            Directory.CreateDirectory(uploadDirectory);
            var destination = Path.Combine(uploadDirectory, fileName);
            await File.WriteAllBytesAsync(destination, content, cancellationToken);
        }
        catch (IOException)
        {
            return new ImageSaveResult(null, "Không lưu được ảnh.");
        }

        return new ImageSaveResult($"/uploads/{safeFolder}/{fileName}", null);
    }

    private static bool MatchesExtension(string extension, byte[] content)
    {
        var isJpeg = content.Length >= 3 && content[0] == 0xFF && content[1] == 0xD8 && content[2] == 0xFF;
        var isPng = content.Length >= 8 &&
            content.AsSpan(0, 8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 });
        var isWebp = content.Length >= 12 &&
            content.AsSpan(0, 4).SequenceEqual("RIFF"u8) &&
            content.AsSpan(8, 4).SequenceEqual("WEBP"u8);

        return extension switch
        {
            ".jpg" or ".jpeg" => isJpeg,
            ".png" => isPng,
            ".webp" => isWebp,
            _ => false
        };
    }
}
