using Microsoft.AspNetCore.Mvc;
using MovieBooking.DTOs;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Admin;

public class AdminPromotionController(IPromotionService promotionService) : AdminBaseController
{
    /// <summary>GET /api/admin/promotions — paged, filter, sort.</summary>
    [HttpGet("promotions")]
    public async Task<IActionResult> GetPromotions([FromQuery] AdminPromotionQueryDto query)
        => Ok(await promotionService.GetPromotionsPagedAsync(query));

    /// <summary>GET /api/admin/promotions/summary</summary>
    [HttpGet("promotions/summary")]
    public async Task<IActionResult> GetSummary()
        => Ok(await promotionService.GetPromotionSummaryAsync());

    /// <summary>POST /api/admin/promotions</summary>
    [HttpPost("promotions")]
    public async Task<IActionResult> CreatePromotion([FromBody] PromotionFormDto request)
    {
        var result = await promotionService.CreatePromotionAsync(request);
        if (!result.Success)
        {
            if (result.Conflict) return Conflict(new { message = result.Error });
            return BadRequest(new { message = result.Error });
        }
        return Ok(new { success = true, message = "Thêm mã khuyến mãi thành công!", id = result.Id });
    }

    /// <summary>PUT /api/admin/promotions/{id}</summary>
    [HttpPut("promotions/{id:int}")]
    public async Task<IActionResult> UpdatePromotion(int id, [FromBody] PromotionFormDto request)
    {
        var result = await promotionService.UpdatePromotionAsync(id, request);
        if (result.NotFound) return NotFound(new { message = "Không tìm thấy mã khuyến mãi." });
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(new { success = true, message = "Cập nhật khuyến mãi thành công!" });
    }

    /// <summary>PATCH /api/admin/promotions/{id}/toggle</summary>
    [HttpPatch("promotions/{id:int}/toggle")]
    public async Task<IActionResult> TogglePromotion(int id)
    {
        var result = await promotionService.TogglePromotionAsync(id);
        if (!result.Found) return NotFound(new { message = "Không tìm thấy khuyến mãi." });
        return Ok(new { success = true, id, status = result.Status });
    }

    /// <summary>DELETE /api/admin/promotions/{id}</summary>
    [HttpDelete("promotions/{id:int}")]
    public async Task<IActionResult> DeletePromotion(int id)
    {
        var result = await promotionService.DeletePromotionAsync(id);
        if (!result.Found) return NotFound(new { message = "Không tìm thấy khuyến mãi." });
        if (result.Archived)
            return Ok(new { success = true, message = "Mã khuyến mãi đã có lượt sử dụng, đã chuyển sang trạng thái ngưng hoạt động." });
        return Ok(new { success = true, message = "Xóa mã khuyến mãi thành công!" });
    }
}
