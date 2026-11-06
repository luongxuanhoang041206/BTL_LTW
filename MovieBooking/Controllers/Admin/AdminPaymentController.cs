using Microsoft.AspNetCore.Mvc;
using MovieBooking.DTOs;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Admin;

public class AdminPaymentController(IPaymentService paymentService) : AdminBaseController
{
    /// <summary>GET /api/admin/payments — paged, filter, sort.</summary>
    [HttpGet("payments")]
    public async Task<IActionResult> GetPayments([FromQuery] AdminPaymentQueryDto query)
        => Ok(await paymentService.GetAdminPaymentsPagedAsync(query));

    /// <summary>GET /api/admin/payments/summary</summary>
    [HttpGet("payments/summary")]
    public async Task<IActionResult> GetSummary([FromQuery] AdminPaymentQueryDto query)
        => Ok(await paymentService.GetAdminPaymentSummaryAsync(query));

    /// <summary>GET /api/admin/payments/{id}</summary>
    [HttpGet("payments/{id:int}")]
    public async Task<IActionResult> GetDetail(int id)
    {
        var detail = await paymentService.GetAdminPaymentDetailAsync(id);
        if (detail == null)
            return NotFound(new { message = "Không tìm thấy giao dịch." });
        return Ok(detail);
    }

    /// <summary>POST /api/admin/payments/{id}/verify — xác nhận thủ công (chỉ Pending).</summary>
    [HttpPost("payments/{id:int}/verify")]
    public async Task<IActionResult> VerifyPayment(int id)
    {
        if (!await paymentService.VerifyAdminPaymentAsync(id))
            return NotFound(new { message = "Không tìm thấy giao dịch hoặc giao dịch không ở trạng thái Pending." });
        return Ok(new { success = true, message = "Xác nhận thanh toán thành công!" });
    }
}
