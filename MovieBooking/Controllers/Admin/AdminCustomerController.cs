using Microsoft.AspNetCore.Mvc;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Admin;

public class AdminCustomerController(ICustomerService customerService) : AdminBaseController
{
    [HttpGet("customers")]
    public async Task<IActionResult> GetCustomers([FromQuery] string? search)
        => Ok(await customerService.GetCustomersAsync(search));

    [HttpPatch("customers/{id}/toggle-status")]
    public async Task<IActionResult> ToggleCustomerStatus(int id)
    {
        var result = await customerService.ToggleCustomerStatusAsync(id);
        if (result == null) return NotFound(new { message = "Không tìm thấy khách hàng." });
        return Ok(new { success = true, userId = result.UserId, status = result.Status, message = result.Message });
    }

    [HttpGet("customers/{id}/bookings")]
    public async Task<IActionResult> GetCustomerBookings(int id)
        => Ok(await customerService.GetCustomerBookingsAsync(id));
}
