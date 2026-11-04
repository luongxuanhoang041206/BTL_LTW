using Microsoft.AspNetCore.Mvc;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Admin;

public class AdminDashboardController(IAdminReportingService reportingService) : AdminBaseController
{
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
        => Ok(await reportingService.GetDashboardAsync());
}
