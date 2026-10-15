using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.DTOs;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Api;

[ApiController]
[Route("api/booking")]
public class ApiBookingController : ControllerBase
{
    private readonly IBookingService _bookingService;
    private readonly IPaymentService _paymentService;

    public ApiBookingController(IBookingService bookingService, IPaymentService paymentService)
    {
        _bookingService = bookingService;
        _paymentService = paymentService;
    }

    private int? GetCurrentUserId() => HttpContext.Session.GetInt32("UserId");

    [HttpGet("seatmap/{showtimeId}")]
    public async Task<IActionResult> GetSeatMap(int showtimeId)
    {
        await _bookingService.ReleaseExpiredHoldsAsync(showtimeId);
        var userId = GetCurrentUserId() ?? 0;
        var vm = await _bookingService.GetSeatMapAsync(showtimeId, userId);
        if (vm == null)
        {
            return NotFound(new { message = "Không tìm thấy suất chiếu hoặc phòng chiếu." });
        }

        return Ok(vm);
    }

    public class ApiHoldSeatsRequest
    {
        public int ShowtimeId { get; set; }
        public List<int> SeatIds { get; set; } = new();
    }

    [HttpPost("hold")]
    public async Task<IActionResult> HoldSeats([FromBody] ApiHoldSeatsRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "Vui lòng đăng nhập để chọn ghế." });
        }

        if (request.SeatIds == null || request.SeatIds.Count == 0)
        {
            return BadRequest(new { message = "Vui lòng chọn ít nhất một ghế." });
        }

        var (success, error) = await _bookingService.HoldSeatsAsync(
            request.ShowtimeId, request.SeatIds, userId.Value);

        if (!success)
        {
            return BadRequest(new { success = false, message = error ?? "Không thể giữ ghế." });
        }

        return Ok(new
        {
            success = true,
            message = "Giữ ghế thành công (10 phút)!",
            expiresAt = DateTime.Now.AddMinutes(10).ToString("o")
        });
    }


    [HttpGet("my-bookings")]
    public async Task<IActionResult> GetMyBookings()
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "Vui lòng đăng nhập để xem vé đã đặt." });
        }

        var bookings = await _bookingService.GetUserBookingsAsync(userId.Value);
        return Ok(bookings);
    }

    [HttpPost("cancel/{bookingId}")]
    public async Task<IActionResult> CancelBooking(int bookingId)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "Vui lòng đăng nhập." });
        }

        var (success, error) = await _bookingService.CancelBookingAsync(bookingId, userId.Value);
        if (!success)
        {
            return BadRequest(new { success = false, message = error ?? "Không thể hủy vé." });
        }

        return Ok(new { success = true, message = "Hủy vé thành công!" });
    }
}
