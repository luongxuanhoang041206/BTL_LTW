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

    public class ApiCheckoutRequest
    {
        public int ShowtimeId { get; set; }
        public List<int> SeatIds { get; set; } = new();
        public string? PromoCode { get; set; }
        public string PaymentMethod { get; set; } = "VNPay";
    }

    [HttpPost("checkout")]
    public async Task<IActionResult> Checkout([FromBody] ApiCheckoutRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "Vui lòng đăng nhập để thanh toán." });
        }

        if (request.SeatIds == null || request.SeatIds.Count == 0)
        {
            return BadRequest(new { message = "Vui lòng chọn ghế trước khi thanh toán." });
        }

        // Lấy thông tin sơ đồ ghế để tìm ShowtimeSeatId
        var seatMap = await _bookingService.GetSeatMapAsync(request.ShowtimeId, userId.Value);
        if (seatMap == null)
        {
            return BadRequest(new { message = "Không tìm thấy suất chiếu." });
        }

        var showtimeSeatIds = new List<int>();
        foreach (var row in seatMap.Rows)
        {
            foreach (var seat in row.Seats)
            {
                if (request.SeatIds.Contains(seat.SeatId))
                {
                    // Nếu chưa hold thì tự động hold
                    if (!seat.IsHeldByCurrentUser && seat.Status == "Available")
                    {
                        await _bookingService.HoldSeatsAsync(request.ShowtimeId, new List<int> { seat.SeatId }, userId.Value);
                    }
                    showtimeSeatIds.Add(seat.ShowtimeSeatId);
                }
            }
        }

        if (showtimeSeatIds.Count == 0)
        {
            return BadRequest(new { message = "Không tìm thấy thông tin ghế đã chọn." });
        }

        // Xác nhận tạo Booking
        var (confirmSuccess, bookingId, confirmError) = await _bookingService.ConfirmBookingAsync(
            request.ShowtimeId, showtimeSeatIds, userId.Value, request.PromoCode);

        if (!confirmSuccess || bookingId == null)
        {
            return BadRequest(new { success = false, message = confirmError ?? "Đặt vé thất bại." });
        }

        // Xử lý thanh toán thành công
        var (paySuccess, paymentId, payError) = await _paymentService.ProcessPaymentAsync(
            bookingId.Value, userId.Value, request.PaymentMethod);

        if (!paySuccess)
        {
            return Ok(new
            {
                success = true,
                bookingId = bookingId.Value,
                isPaid = false,
                message = "Đặt vé thành công, đang chờ thanh toán: " + payError
            });
        }

        return Ok(new
        {
            success = true,
            bookingId = bookingId.Value,
            paymentId,
            isPaid = true,
            message = "Đặt vé và thanh toán thành công!"
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
