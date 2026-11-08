using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.DTOs;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Client;

[ApiController]
[Route("api/tickets")]
public class ApiTicketsController : ControllerBase
{
    private readonly ITicketService _ticketService;

    public ApiTicketsController(ITicketService ticketService)
    {
        _ticketService = ticketService;
    }

    private int? GetCurrentUserId() => HttpContext.Session.GetInt32("UserId");
    private string? GetCurrentRole() => HttpContext.Session.GetString("Role");

    /// <summary>GET /api/tickets/booking/{bookingId} — danh sách vé của booking (chỉ chủ booking).</summary>
    [HttpGet("booking/{bookingId:int}")]
    public async Task<IActionResult> GetBookingTickets(int bookingId)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized(new { message = "Vui lòng đăng nhập." });

        var result = await _ticketService.GetBookingTicketsAsync(bookingId, userId.Value);
        if (result == null)
            return NotFound(new { message = "Không tìm thấy vé cho đơn đặt vé này." });

        return Ok(result);
    }

    /// <summary>GET /api/tickets/{ticketId}/qr — ảnh PNG QR sinh từ QRToken (chỉ chủ booking).</summary>
    [HttpGet("{ticketId:int}/qr")]
    public async Task<IActionResult> GetTicketQr(int ticketId)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized(new { message = "Vui lòng đăng nhập." });

        var png = await _ticketService.GetTicketQrPngAsync(ticketId, userId.Value);
        if (png == null)
            return NotFound(new { message = "Không tìm thấy vé hoặc bạn không có quyền xem." });

        return File(png, "image/png");
    }

    /// <summary>
    /// POST /api/tickets/check-in — nhân viên rạp/Admin quét QR để check-in.
    /// StaffId luôn lấy từ phiên đăng nhập, không nhận từ request.
    /// </summary>
    [HttpPost("check-in")]
    public async Task<IActionResult> CheckIn([FromBody] TicketCheckInRequestDto request)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized(new { success = false, message = "Vui lòng đăng nhập." });

        var role = GetCurrentRole();
        var isStaff = string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase) ||
                      string.Equals(role, "Staff", StringComparison.OrdinalIgnoreCase);
        if (!isStaff)
            return StatusCode(StatusCodes.Status403Forbidden,
                new { success = false, message = "Bạn không có quyền check-in vé." });

        if (request == null || string.IsNullOrWhiteSpace(request.QrToken))
            return BadRequest(new { success = false, message = "Mã QR không hợp lệ." });

        var result = await _ticketService.CheckInAsync(request.QrToken.Trim(), userId.Value);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}
