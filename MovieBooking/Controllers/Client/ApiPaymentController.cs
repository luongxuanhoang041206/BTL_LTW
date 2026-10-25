using Microsoft.AspNetCore.Mvc;
using MovieBooking.Data;
using MovieBooking.DTOs;
using MovieBooking.Services.Interfaces;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;

namespace MovieBooking.Controllers.Client
{
    [ApiController]
    [Route("api/payment")]
    public class ApiPaymentController : ControllerBase
    {
        private readonly IPaymentService _paymentService;
        private readonly MovieBookingContext _context;
        private readonly IConfiguration _config;

        public ApiPaymentController(IPaymentService paymentService, MovieBookingContext context, IConfiguration config)
        {
            _paymentService = paymentService;
            _context = context;
            _config = config;
        }

        private int? GetCurrentUserId() => HttpContext.Session.GetInt32("UserId");

        public class PaymentReturnRequest
        {
            public int PaymentId { get; set; }
            public string TransactionCode { get; set; } = string.Empty;
            public bool Success { get; set; }
        }

        [HttpPost("return")]
        public async Task<IActionResult> ReturnResult([FromBody] PaymentReturnRequest request)
        {
            var (confirmed, error) = await _paymentService.ConfirmPaymentResultAsync(
                request.PaymentId, request.TransactionCode, request.Success);

            if (!confirmed)
            {
                return BadRequest(new
                {
                    success = false,
                    message = error ?? "Giao d?ch thanh toán th?t b?i."
                });
            }

            return Ok(new { success = true, message = "Thanh toán thành công." });
        }

        public class PaymentRequestModel
        {
            public int BookingId { get; set; }
            public string Method { get; set; } = "VNPAY";
        }

        [HttpPost("checkout")]
        public async Task<IActionResult> Checkout([FromBody] PaymentRequestModel request)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { success = false, message = "Vui lòng dang nh?p d? thanh toán." });
            }

            string ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

            //service khoi tao thanh toan
            var (success, paymentId, paymentUrl, error) = await _paymentService.InitializePaymentAsync(
                request.BookingId, userId.Value, request.Method, ipAddress);

            if (!success)
            {
                return BadRequest(new { success = false, message = error ?? "Không th? kh?i t?o thanh toán." });
            }

            // Tra ve json, co them paymenturl de trang dieu huong sang phan thanh toan
            return Ok(new
            {
                success = true,
                paymentId = paymentId,
                paymentUrl = paymentUrl,
                message = "Kh?i t?o phiên thanh toán thành công."
            });
        }

        //api nhan ket qua ve tu cong thanh toan
        [HttpPost("sepay-webhook")]
        public async Task<IActionResult> SePayWebhook([FromBody] SePayWebhookDto dto)
        {
            var received = Request.Headers.Authorization.ToString();
            var expected = $"Apikey {_config["SePay:ApiKey"]}";

            if (string.IsNullOrWhiteSpace(_config["SePay:ApiKey"]) ||
                !CryptographicOperations.FixedTimeEquals(
                    Encoding.UTF8.GetBytes(received),
                    Encoding.UTF8.GetBytes(expected)))
            {
                return Unauthorized();
            }

            await _paymentService.ProcessBankTransferAsync(dto);

            return Ok(new { success = true });
        }

        [HttpGet("status/{paymentId:int}")]
        public async Task<IActionResult> Status(int paymentId)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var payment = await _context.Payments
                .Where(p => p.PaymentId == paymentId && p.Booking.UserId == userId)
                .Select(p => new { Status = p.PaymentStatus, p.BookingId })
                .FirstOrDefaultAsync();

            if (payment == null) return NotFound();
            return Ok(new { status = payment.Status, bookingId = payment.BookingId });
        }

        public class CreateBankPaymentRequest { public int BookingId { get; set; } }

        [HttpPost("bank")]
        public async Task<IActionResult> CreateBank([FromBody] CreateBankPaymentRequest req)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { success = false, message = "Vui lòng dang nh?p d? thanh toán." });

            var r = await _paymentService.CreateBankPaymentAsync(req.BookingId, userId.Value);
            if (!r.Success)
                return BadRequest(new { success = false, message = r.Error });

            return Ok(new { success = true, info = r.Info });
        }
    }
}
