using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;

namespace MovieBooking.Controllers.Client;

[ApiController]
[Route("api/website-content")]
public class ApiWebsiteContentController(MovieBookingContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetPublished()
    {
        var row = await context.WebsiteContents.AsNoTracking().SingleOrDefaultAsync(x => x.ContentKey == "site");
        if (row?.PublishedJson is not { Length: > 0 } json) return Ok(null);
        using var document = System.Text.Json.JsonDocument.Parse(json);
        return Ok(document.RootElement.Clone());
    }
}
