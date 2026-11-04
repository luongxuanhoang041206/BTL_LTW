using Microsoft.AspNetCore.Mvc;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Admin;

public class AdminWebsiteContentController(IWebsiteContentService websiteContentService) : AdminBaseController
{
    [HttpGet("website-content")]
    public async Task<IActionResult> Get()
    {
        var content = await websiteContentService.GetAdminContentAsync();
        return Ok(new { draft = content.Draft, published = content.Published, updatedAt = content.UpdatedAt, publishedAt = content.PublishedAt });
    }

    [HttpPut("website-content/draft")]
    public async Task<IActionResult> SaveDraft([FromBody] System.Text.Json.JsonElement content)
    {
        var error = await websiteContentService.SaveDraftAsync(content, HttpContext.Session.GetInt32("UserId"));
        if (error != null) return BadRequest(new { message = error });
        return Ok(new { success = true });
    }

    [HttpPost("website-content/publish")]
    public async Task<IActionResult> Publish()
    {
        if (!await websiteContentService.PublishAsync()) return NotFound(new { message = "Chưa có bản nháp." });
        return Ok(new { success = true });
    }
}
