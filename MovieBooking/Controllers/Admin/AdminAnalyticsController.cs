using Microsoft.AspNetCore.Mvc;
using MovieBooking.DTOs;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Admin;

public class AdminAnalyticsController(IAdminReportingService reportingService) : AdminBaseController
{
    [HttpGet("analytics/revenue")]
    [HttpGet("reports/revenue")]
    [ProducesResponseType(typeof(AdminRevenueAnalyticsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetRevenueAnalytics([FromQuery] RevenueReportQueryDto query)
        => Ok(await reportingService.GetRevenueAnalyticsAsync(query));
}