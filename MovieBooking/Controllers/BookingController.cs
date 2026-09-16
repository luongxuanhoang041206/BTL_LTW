using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.DTOs;
using MovieBooking.Filters;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers;

[SessionAuthorize]
public class BookingController : Controller
{
    private readonly IBookingService _bookingService;
    private readonly IPaymentService _paymentService;

    // Session keys
    private const string SessionHeldSeatIds  = "HeldSeatIds";      // JSON list<int> ShowtimeSeatId
    private const string SessionHeldShowtime = "HeldShowtimeId";   // int
    private const string SessionHoldExpires  = "HoldExpiresAt";    // ISO8601 string
    private const string SessionPromoCode    = "HeldPromoCode";    // string

    public BookingController(IBookingService bookingService, IPaymentService paymentService)
    {
        _bookingService = bookingService;
        _paymentService = paymentService;
    }

    private int GetCurrentUserId() => HttpContext.Session.GetInt32("UserId")!.Value;

    // -----------------------------------------------------------------------
    // SHOWTIME SELECTION
    // GET /Booking/Showtimes/{movieId}
    // -----------------------------------------------------------------------

    public async Task<IActionResult> Showtimes(int movieId)
    {
        var vm = await _bookingService.GetShowtimeSelectionAsync(movieId);
        if (vm == null) return NotFound();
        return View(vm);
    }

    // -----------------------------------------------------------------------
    // SEAT MAP
    // GET /Booking/SelectSeat/{showtimeId}
    // -----------------------------------------------------------------------

    public async Task<IActionResult> SelectSeat(int showtimeId)
    {
        // Giải phóng expired holds trước khi render
        await _bookingService.ReleaseExpiredHoldsAsync(showtimeId);

        var userId = GetCurrentUserId();
        var vm = await _bookingService.GetSeatMapAsync(showtimeId, userId);
        if (vm == null) return NotFound();

        return View(vm);
    }

    // -----------------------------------------------------------------------
    // HOLD SEATS
    // POST /Booking/HoldSeats
    // -----------------------------------------------------------------------

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> HoldSeats(HoldSeatsRequest request)
    {
        if (request.SelectedSeatIds == null || request.SelectedSeatIds.Count == 0)
        {
            TempData["Error"] = "Vui lòng chọn ít nhất một ghế.";
            return RedirectToAction(nameof(SelectSeat), new { showtimeId = request.ShowtimeId });
        }

        var userId = GetCurrentUserId();
        var (success, error) = await _bookingService.HoldSeatsAsync(
            request.ShowtimeId, request.SelectedSeatIds, userId);

        if (!success)
        {
            TempData["Error"] = error;
            return RedirectToAction(nameof(SelectSeat), new { showtimeId = request.ShowtimeId });
        }

        // Lưu thông tin hold vào Session
        // Cần convert SeatId → ShowtimeSeatId: lấy lại từ service thông qua seat map
        var seatMap = await _bookingService.GetSeatMapAsync(request.ShowtimeId, userId);
        if (seatMap == null)
        {
            TempData["Error"] = "Không thể lấy thông tin ghế.";
            return RedirectToAction(nameof(SelectSeat), new { showtimeId = request.ShowtimeId });
        }

        // Map SeatId → ShowtimeSeatId cho các ghế vừa được hold
        var showtimeSeatIds = new List<int>();
        foreach (var row in seatMap.Rows)
        {
            foreach (var seat in row.Seats)
            {
                if (request.SelectedSeatIds.Contains(seat.SeatId)
                    && seat.IsHeldByCurrentUser)
                {
                    showtimeSeatIds.Add(seat.ShowtimeSeatId);
                }
            }
        }

        if (showtimeSeatIds.Count == 0)
        {
            TempData["Error"] = "Không thể xác nhận ghế đã giữ.";
            return RedirectToAction(nameof(SelectSeat), new { showtimeId = request.ShowtimeId });
        }

        var expiresAt = DateTime.Now.AddMinutes(10);

        HttpContext.Session.SetString(SessionHeldSeatIds,
            JsonSerializer.Serialize(showtimeSeatIds));
        HttpContext.Session.SetInt32(SessionHeldShowtime, request.ShowtimeId);
        HttpContext.Session.SetString(SessionHoldExpires, expiresAt.ToString("o"));
        HttpContext.Session.Remove(SessionPromoCode);

        return RedirectToAction(nameof(Confirm));
    }

    // -----------------------------------------------------------------------
    // CONFIRM — GET
    // GET /Booking/Confirm
    // -----------------------------------------------------------------------

    public async Task<IActionResult> Confirm()
    {
        var (showtimeSeatIds, showtimeId, expiresAt) = ReadHoldSession();
        if (showtimeSeatIds == null || showtimeId == null || expiresAt == null)
        {
            TempData["Error"] = "Phiên giữ ghế không hợp lệ. Vui lòng chọn ghế lại.";
            return RedirectToAction(nameof(SelectSeat), new { showtimeId = 0 });
        }

        if (expiresAt.Value < DateTime.Now)
        {
            ClearHoldSession();
            TempData["Error"] = "Thời gian giữ ghế đã hết. Vui lòng chọn lại.";
            return RedirectToAction(nameof(SelectSeat), new { showtimeId = showtimeId.Value });
        }

        var userId = GetCurrentUserId();
        var seatMap = await _bookingService.GetSeatMapAsync(showtimeId.Value, userId);
        if (seatMap == null) return NotFound();

        // Build held seats info
        var heldSeats = new List<HeldSeatInfo>();
        foreach (var row in seatMap.Rows)
        {
            foreach (var seat in row.Seats)
            {
                if (showtimeSeatIds.Contains(seat.ShowtimeSeatId) && seat.IsHeldByCurrentUser)
                {
                    heldSeats.Add(new HeldSeatInfo
                    {
                        ShowtimeSeatId = seat.ShowtimeSeatId,
                        SeatLabel      = $"{seat.SeatRow}{seat.SeatNumber}",
                        SeatType       = seat.SeatType,
                        Price          = seatMap.PricePerSeat
                    });
                }
            }
        }

        if (heldSeats.Count == 0)
        {
            ClearHoldSession();
            TempData["Error"] = "Ghế đã hết hạn giữ. Vui lòng chọn lại.";
            return RedirectToAction(nameof(SelectSeat), new { showtimeId = showtimeId.Value });
        }

        // Promo từ session (nếu user đã áp mã trước đó)
        decimal discountPercent = 0;
        string? promoCode = HttpContext.Session.GetString(SessionPromoCode);
        if (!string.IsNullOrEmpty(promoCode))
        {
            var (valid, promo, _) = await _bookingService.ValidatePromoAsync(promoCode);
            if (valid && promo != null) discountPercent = promo.DiscountPercent;
            else promoCode = null;
        }

        var vm = new BookingConfirmViewModel
        {
            ShowtimeId      = seatMap.ShowtimeId,
            MovieTitle      = seatMap.MovieTitle,
            PosterUrl       = seatMap.PosterUrl,
            ShowDate        = seatMap.ShowDate,
            StartTime       = seatMap.StartTime,
            CinemaName      = seatMap.CinemaName,
            RoomName        = seatMap.RoomName,
            RoomType        = seatMap.RoomType,
            PricePerSeat    = seatMap.PricePerSeat,
            HeldSeats       = heldSeats,
            HoldExpiresAt   = expiresAt.Value,
            AppliedPromoCode = promoCode,
            DiscountPercent  = discountPercent
        };

        return View(vm);
    }

    // -----------------------------------------------------------------------
    // APPLY PROMO (AJAX)
    // POST /Booking/ApplyPromo
    // -----------------------------------------------------------------------

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> ApplyPromo(string? promoCode)
    {
        if (string.IsNullOrWhiteSpace(promoCode))
        {
            HttpContext.Session.Remove(SessionPromoCode);
            return Json(new { success = false, error = "Vui lòng nhập mã giảm giá." });
        }

        var (valid, promo, error) = await _bookingService.ValidatePromoAsync(promoCode);
        if (!valid)
            return Json(new { success = false, error });

        HttpContext.Session.SetString(SessionPromoCode, promoCode.Trim().ToUpper());

        return Json(new
        {
            success         = true,
            discountPercent = promo!.DiscountPercent,
            description     = promo.Description,
            code            = promo.Code
        });
    }

    // -----------------------------------------------------------------------
    // CONFIRM — POST (tạo Booking)
    // POST /Booking/Confirm
    // -----------------------------------------------------------------------

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Confirm(BookingConfirmRequest request)
    {
        var (showtimeSeatIds, showtimeId, expiresAt) = ReadHoldSession();

        if (showtimeSeatIds == null || showtimeId == null || expiresAt == null)
        {
            TempData["Error"] = "Phiên giữ ghế không hợp lệ. Vui lòng chọn ghế lại.";
            return RedirectToAction(nameof(SelectSeat), new { showtimeId = request.ShowtimeId });
        }

        if (expiresAt.Value < DateTime.Now)
        {
            ClearHoldSession();
            TempData["Error"] = "Thời gian giữ ghế đã hết. Vui lòng chọn lại.";
            return RedirectToAction(nameof(SelectSeat), new { showtimeId = showtimeId.Value });
        }

        var userId    = GetCurrentUserId();
        var promoCode = !string.IsNullOrWhiteSpace(request.PromoCode)
            ? request.PromoCode
            : HttpContext.Session.GetString(SessionPromoCode);

        var (success, bookingId, error) = await _bookingService.ConfirmBookingAsync(
            showtimeId.Value, showtimeSeatIds, userId, promoCode);

        if (!success)
        {
            TempData["Error"] = error;
            // Nếu ghế hết hạn → về SelectSeat, ngược lại ở lại Confirm
            if (error?.Contains("hết thời gian") == true || error?.Contains("hết hạn") == true)
            {
                ClearHoldSession();
                return RedirectToAction(nameof(SelectSeat), new { showtimeId = showtimeId.Value });
            }
            return RedirectToAction(nameof(Confirm));
        }

        ClearHoldSession();
        return RedirectToAction(nameof(Payment), new { bookingId = bookingId!.Value });
    }

    // -----------------------------------------------------------------------
    // PAYMENT — GET
    // GET /Booking/Payment/{bookingId}
    // -----------------------------------------------------------------------

    public async Task<IActionResult> Payment(int bookingId)
    {
        var userId = GetCurrentUserId();
        var vm = await _bookingService.GetPaymentViewModelAsync(bookingId, userId);

        if (vm == null)
        {
            TempData["Error"] = "Booking không hợp lệ hoặc đã được xử lý.";
            return RedirectToAction(nameof(History));
        }

        return View(vm);
    }

    // -----------------------------------------------------------------------
    // PROCESS PAYMENT — POST
    // POST /Booking/ProcessPayment
    // -----------------------------------------------------------------------

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> ProcessPayment(PaymentRequest request)
    {
        if (!ModelState.IsValid)
        {
            TempData["Error"] = "Vui lòng chọn phương thức thanh toán.";
            return RedirectToAction(nameof(Payment), new { bookingId = request.BookingId });
        }

        var userId = GetCurrentUserId();
        var (success, _, error) = await _paymentService.ProcessPaymentAsync(
            request.BookingId, userId, request.Method, request.SimulateFailure);

        if (!success)
        {
            TempData["Error"] = error ?? "Thanh toán thất bại. Vui lòng thử lại.";
            return RedirectToAction(nameof(Payment), new { bookingId = request.BookingId });
        }

        TempData["Success"] = "Đặt vé thành công!";
        return RedirectToAction(nameof(BookingSuccess), new { bookingId = request.BookingId });
    }

    // -----------------------------------------------------------------------
    // SUCCESS
    // GET /Booking/Success/{bookingId}
    // -----------------------------------------------------------------------

    public async Task<IActionResult> BookingSuccess(int bookingId)
    {
        var userId = GetCurrentUserId();
        var vm = await _bookingService.GetSuccessViewModelAsync(bookingId, userId);

        if (vm == null)
        {
            TempData["Error"] = "Không tìm thấy thông tin đặt vé.";
            return RedirectToAction(nameof(History));
        }

        return View(vm);
    }

    // -----------------------------------------------------------------------
    // HISTORY
    // GET /Booking/History
    // -----------------------------------------------------------------------

    public async Task<IActionResult> History()
    {
        var userId  = GetCurrentUserId();
        var bookings = await _bookingService.GetUserBookingsAsync(userId);
        return View(bookings);
    }

    // -----------------------------------------------------------------------
    // DETAIL
    // GET /Booking/Detail/{bookingId}
    // -----------------------------------------------------------------------

    public async Task<IActionResult> Detail(int bookingId)
    {
        var userId = GetCurrentUserId();
        var vm = await _bookingService.GetBookingDetailAsync(bookingId, userId);

        if (vm == null) return NotFound();

        return View(vm);
    }

    // -----------------------------------------------------------------------
    // CANCEL
    // POST /Booking/Cancel/{bookingId}
    // -----------------------------------------------------------------------

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Cancel(int bookingId)
    {
        var userId = GetCurrentUserId();
        var (success, error) = await _bookingService.CancelBookingAsync(bookingId, userId);

        if (!success)
        {
            TempData["Error"] = error ?? "Không thể hủy booking này.";
        }
        else
        {
            TempData["Success"] = "Đã hủy booking thành công.";
        }

        return RedirectToAction(nameof(Detail), new { bookingId });
    }

    // -----------------------------------------------------------------------
    // HELPERS — Session management
    // -----------------------------------------------------------------------

    private (List<int>? SeatIds, int? ShowtimeId, DateTime? ExpiresAt) ReadHoldSession()
    {
        var seatIdsJson = HttpContext.Session.GetString(SessionHeldSeatIds);
        var showtimeId  = HttpContext.Session.GetInt32(SessionHeldShowtime);
        var expiresStr  = HttpContext.Session.GetString(SessionHoldExpires);

        if (seatIdsJson == null || showtimeId == null || expiresStr == null)
            return (null, null, null);

        try
        {
            var seatIds  = JsonSerializer.Deserialize<List<int>>(seatIdsJson);
            var expires  = DateTime.Parse(expiresStr);
            return (seatIds, showtimeId, expires);
        }
        catch
        {
            return (null, null, null);
        }
    }

    private void ClearHoldSession()
    {
        HttpContext.Session.Remove(SessionHeldSeatIds);
        HttpContext.Session.Remove(SessionHeldShowtime);
        HttpContext.Session.Remove(SessionHoldExpires);
        HttpContext.Session.Remove(SessionPromoCode);
    }
}
