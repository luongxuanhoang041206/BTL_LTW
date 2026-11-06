using Microsoft.AspNetCore.Mvc;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Client;

[ApiController]
[Route("api/website-content")]
public class ApiWebsiteContentController(IWebsiteContentService websiteContentService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetPublished()
    {
        var content = await websiteContentService.GetPublishedContentAsync();
        return Ok(content);
    }
}
