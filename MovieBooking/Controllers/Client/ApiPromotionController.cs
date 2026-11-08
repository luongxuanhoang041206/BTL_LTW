using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.DTOs.Promotion;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Client;

[ApiController]
[Route("api/promotions")]
public class ApiPromotionController(IPromotionService promotionService) : ControllerBase
{
    private int? GetCurrentUserId() => HttpContext.Session.GetInt32("UserId");

    /// <summary>GET /api/promotions/available — mã khách hàng còn có thể dùng.</summary>
    [HttpGet("available")]
    public async Task<IActionResult> GetAvailable()
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized(new { success = false, message = "Vui lòng đăng nhập." });

        var promotions = await promotionService.GetAvailablePromotionsAsync(userId.Value);
        return Ok(new { success = true, promotions });
    }

    /// <summary>POST /api/promotions/preview — xem trước giảm giá cho giỏ hàng hiện tại.</summary>
    [HttpPost("preview")]
    public async Task<IActionResult> Preview([FromBody] PromotionPreviewRequestDto request)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized(new { success = false, message = "Vui lòng đăng nhập." });

        if (string.IsNullOrWhiteSpace(request.Code))
            return BadRequest(new { success = false, message = "Vui lòng nhập mã giảm giá." });

        var result = await promotionService.PreviewPromotionAsync(request, userId.Value);
        if (!result.Valid)
            return BadRequest(new { success = false, message = result.Error ?? "Mã giảm giá không hợp lệ." });

        return Ok(new
        {
            success = true,
            code = result.Code,
            discountType = result.DiscountType,
            discountValue = result.DiscountValue,
            promotionScope = result.PromotionScope,
            orderAmount = result.OrderAmount,
            eligibleAmount = result.EligibleAmount,
            discountAmount = result.DiscountAmount,
            totalAmount = result.TotalAmount,
        });
    }
}