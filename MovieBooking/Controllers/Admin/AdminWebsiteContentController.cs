using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Models;

namespace MovieBooking.Controllers.Admin;

public class AdminWebsiteContentController(MovieBooking.Data.MovieBookingContext context) : AdminBaseController(context)
{
    [HttpGet("website-content")]
    public async Task<IActionResult> Get()
    {
        var row = await _context.WebsiteContents.SingleOrDefaultAsync(x => x.ContentKey == "site");
        return Ok(new { draft = row?.DraftJson ?? "{}", published = row?.PublishedJson ?? "{}", updatedAt = row?.UpdatedAt, publishedAt = row?.PublishedAt });
    }

    [HttpPut("website-content/draft")]
    public async Task<IActionResult> SaveDraft([FromBody] System.Text.Json.JsonElement content)
    {
        var json = content.GetRawText();
        if (json.Length > 100_000) return BadRequest(new { message = "Nội dung vượt quá giới hạn." });
        if (content.ValueKind != System.Text.Json.JsonValueKind.Object)
            return BadRequest(new { message = "Nội dung website phải là một đối tượng JSON." });
        var validation = ValidateContent(content);
        if (validation != null) return BadRequest(new { message = validation });
        var row = await _context.WebsiteContents.SingleOrDefaultAsync(x => x.ContentKey == "site");
        if (row == null) { row = new WebsiteContent { ContentKey = "site" }; _context.WebsiteContents.Add(row); }
        row.DraftJson = json;
        row.UpdatedAt = DateTime.UtcNow;
        row.UpdatedByUserId = HttpContext.Session.GetInt32("UserId");
        await _context.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPost("website-content/publish")]
    public async Task<IActionResult> Publish()
    {
        var row = await _context.WebsiteContents.SingleOrDefaultAsync(x => x.ContentKey == "site");
        if (row == null) return NotFound(new { message = "Chưa có bản nháp." });
        row.PublishedJson = row.DraftJson;
        row.PublishedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { success = true });
    }

    private static string? ValidateContent(System.Text.Json.JsonElement content)
    {
        if (content.TryGetProperty("banner", out var banner) && banner.ValueKind == System.Text.Json.JsonValueKind.Object)
        {
            foreach (var key in new[] { "title", "description", "image", "ctaText", "ctaLink" })
                if (banner.TryGetProperty(key, out var value) && value.ValueKind == System.Text.Json.JsonValueKind.String && value.GetString()!.Length > 2000)
                    return $"Trường banner '{key}' vượt quá giới hạn.";
            if (banner.TryGetProperty("order", out var order) && (!order.TryGetInt32(out var number) || number < 1 || number > 1000))
                return "Thứ tự banner phải từ 1 đến 1000.";
        }
        if (content.TryGetProperty("sections", out var sections) && sections.ValueKind == System.Text.Json.JsonValueKind.Array)
            foreach (var section in sections.EnumerateArray())
                if (section.ValueKind != System.Text.Json.JsonValueKind.Object || !section.TryGetProperty("key", out var key) || key.GetString() is not ("nowShowing" or "trailers"))
                    return "Khu vực website không hợp lệ.";
        if (content.TryGetProperty("announcements", out var announcements) && announcements.ValueKind == System.Text.Json.JsonValueKind.Array)
            foreach (var item in announcements.EnumerateArray())
            {
                if (item.ValueKind != System.Text.Json.JsonValueKind.Object) return "Thông báo không hợp lệ.";
                if (item.TryGetProperty("type", out var type) && type.GetString() is not ("normal" or "emergency")) return "Loại thông báo không hợp lệ.";
                if (item.TryGetProperty("text", out var text) && text.ValueKind == System.Text.Json.JsonValueKind.String && text.GetString()!.Length > 500) return "Thông báo vượt quá 500 ký tự.";
            }
        return null;
    }
}
