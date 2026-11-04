using Microsoft.AspNetCore.Mvc;
using MovieBooking.DTOs;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Admin;

public class AdminBookingController(IBookingService bookingService) : AdminBaseController
{
    /// <summary>
    /// GET /api/admin/bookings
    /// Danh sách booking có filter, pagination, sort.
    /// </summary>
    [HttpGet("bookings")]
    public async Task<IActionResult> GetBookings([FromQuery] AdminBookingQueryDto query)
        => Ok(await bookingService.GetAdminBookingsPagedAsync(query));

    /// <summary>
    /// GET /api/admin/bookings/summary
    /// Thống kê tổng quan — áp dụng cùng filter với danh sách.
    /// </summary>
    [HttpGet("bookings/summary")]
    public async Task<IActionResult> GetSummary([FromQuery] AdminBookingQueryDto query)
        => Ok(await bookingService.GetAdminBookingSummaryAsync(query));

    /// <summary>
    /// GET /api/admin/bookings/{id}
    /// Chi tiết một booking kèm payment.
    /// </summary>
    [HttpGet("bookings/{id:int}")]
    public async Task<IActionResult> GetDetail(int id)
    {
        var detail = await bookingService.GetAdminBookingDetailAsync(id);
        if (detail == null)
            return NotFound(new { message = "Không tìm thấy booking." });
        return Ok(detail);
    }
}
