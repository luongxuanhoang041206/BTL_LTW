using Microsoft.AspNetCore.Mvc;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Admin;

public class AdminAnalyticsController(IAdminReportingService reportingService) : AdminBaseController
{
    [HttpGet("analytics/revenue")]
    public async Task<IActionResult> GetRevenueAnalytics()
        => Ok(await reportingService.GetRevenueAnalyticsAsync());

    [HttpGet("analytics/showtime-performance")]
    public async Task<IActionResult> GetShowtimePerformance()
        => Ok(await reportingService.GetShowtimePerformanceAsync());

    [HttpGet("analytics/seat-occupancy")]
    public async Task<IActionResult> GetSeatOccupancy()
        => Ok(await reportingService.GetSeatOccupancyAsync());
}
