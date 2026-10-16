using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.DTOs;
using MovieBooking.Filters;
using MovieBooking.Models;
using MovieBooking.Services.Interfaces;
using System;
using System.Threading.Tasks;

namespace MovieBooking.Controllers;

[SessionAuthorize]
public class PaymentController : Controller
{
    private readonly IPaymentService _paymentService;
    private readonly IBookingService _bookingService;

    public PaymentController(IPaymentService paymentService, IBookingService bookingService)
    {
        _paymentService = paymentService;
        _bookingService = bookingService;
    }

    private int GetCurrentUserId() => HttpContext.Session.GetInt32("UserId")!.Value;


    // PAYMENT — GET: Hiển thị trang chọn cổng thanh toán
    [HttpGet]
    public async Task<IActionResult> Payment(int bookingId)
    {
        var userId = GetCurrentUserId();
        var vm = await _bookingService.GetPaymentViewModelAsync(bookingId, userId);

        if (vm == null)
        {
            TempData["Error"] = "Booking không hợp lệ hoặc đã được xử lý.";
            return RedirectToAction("History", "Booking");
        }

        return View(vm);
    }

    // POST /Payment/ProcessPayment (khoi tao phien thanh toan)
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> ProcessPayment(PaymentRequest request)
    {
        if (!ModelState.IsValid)
        {
            TempData["Error"] = "Vui lòng chọn phương thức thanh toán";
            return RedirectToAction(nameof(Payment), new { bookingId = request.BookingId });
        }

        var userId = GetCurrentUserId();
        string ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        var (success, paymentId, paymentUrl, error) = await _paymentService.InitializePaymentAsync(
            request.BookingId, userId, request.Method, ipAddress);

        if (!success)
        {
            TempData["Error"] = error ?? "Không thể khởi tạo thanh toán. Vui lòng thử lại.";
            return RedirectToAction(nameof(Payment), new { bookingId = request.BookingId });
        }

        return Redirect(paymentUrl!);
    }

    // GET /Payment/ReturnResult (Nhận kết quả từ Cổng thanh toán trả về)
    [HttpGet]
    [AllowAnonymous] // Cho phép cổng thanh toán gọi ngược lại mà không cần ép session user
    public async Task<IActionResult> ReturnResult(int paymentId, string transactionCode, bool success)
    {
        var (isConfirmed, error) = await _paymentService.ConfirmPaymentResultAsync(
            paymentId, transactionCode, success);

        if (!isConfirmed)
        {
            TempData["Error"] = error ?? "Giao dịch thanh toán thất bại.";
            return RedirectToAction("History", "Booking");
        }

        TempData["Success"] = "Thanh toán thành công!";

        return RedirectToAction("Index", "Home");
    }
}