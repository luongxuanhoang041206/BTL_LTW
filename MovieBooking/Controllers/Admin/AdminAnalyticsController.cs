using Microsoft.AspNetCore.Mvc;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Admin;

public class AdminAnalyticsController(IAdminReportingService reportingService) : AdminBaseController
{
    [HttpGet("analytics/revenue")]
    public async Task<IActionResult> GetRevenueAnalytics()
        => Ok(await reportingService.GetRevenueAnalyticsAsync());
}
