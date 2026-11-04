using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.DTOs;
using MovieBooking.Services.Interfaces;
using QRCoder;

namespace MovieBooking.Controllers.Client;

[ApiController]
[Route("api/booking")]
public class ApiBookingController : ControllerBase
{
    private readonly IBookingService _bookingService;
    private readonly IBookingCheckoutService _checkoutService;

    public ApiBookingController(
        IBookingService bookingService,
        IBookingCheckoutService checkoutService)
    {
        _bookingService = bookingService;
        _checkoutService = checkoutService;
    }

    private int? GetCurrentUserId() => HttpContext.Session.GetInt32("UserId");

    [HttpPost("promo")]
    public async Task<IActionResult> ValidatePromo([FromBody] PromoRequestDto request)
    {
        if (GetCurrentUserId() == null)
        {
            return Unauthorized(new { success = false, message = "Vui lòng đăng nhập." });
        }

        if (string.IsNullOrWhiteSpace(request.PromoCode))
        {
            return BadRequest(new { success = false, message = "Vui lòng nhập mã giảm giá." });
        }

        var (valid, promo, error) = await _bookingService.ValidatePromoAsync(request.PromoCode.Trim());
        if (!valid || promo == null)
        {
            return BadRequest(new { success = false, message = error ?? "Mã giảm giá không hợp lệ." });
        }

        return Ok(new
        {
            success = true,
            code = promo.Code,
            discountPercent = promo.DiscountPercent,
            description = promo.Description
        });
    }

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

    [HttpPost("hold")]
    public async Task<IActionResult> HoldSeats([FromBody] ApiHoldSeatsRequestDto request)
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

    [HttpPost("checkout")]
    public async Task<IActionResult> Checkout([FromBody] ApiCheckoutRequestDto request)
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

        var result = await _checkoutService.CheckoutAsync(request, userId.Value);
        if (!result.Success)
        {
            if (result.IncludeSuccessFlag) return BadRequest(new { success = false, message = result.Error });
            return BadRequest(new { message = result.Error });
        }

        return Ok(new
        {
            success = true,
            bookingId = result.BookingId!.Value,
            isPaid = false,
            message = "Đã tạo đơn đặt vé. Vui lòng hoàn tất thanh toán."
        });
    }
    [HttpGet("details/{bookingId}")]
    public async Task<IActionResult> GetBookingDetails(int bookingId)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "Vui lòng đăng nhập." });
        }

        var detail = await _bookingService.GetBookingDetailAsync(bookingId, userId.Value);
        if (detail == null)
        {
            return NotFound(new { message = "Không tìm thấy đơn đặt vé." });
        }

        return Ok(detail);
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

    [HttpGet("{bookingId:int}/ticket-qr")]
    public async Task<IActionResult> GetTicketQr(int bookingId)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized(new { message = "Vui lòng đăng nhập." });

        var ticketCode = await _bookingService.GetTicketCodeAsync(bookingId, userId.Value);
        if (ticketCode == null) return NotFound(new { message = "Không tìm thấy vé hoặc vé chưa thanh toán." });

        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(ticketCode, QRCodeGenerator.ECCLevel.Q);
        var png = new PngByteQRCode(data).GetGraphic(10);
        return File(png, "image/png");
    }
}
