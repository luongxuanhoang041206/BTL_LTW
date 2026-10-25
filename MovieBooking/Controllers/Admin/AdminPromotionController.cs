using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Models;

namespace MovieBooking.Controllers.Admin;

public class AdminPromotionController : AdminBaseController
{
    public AdminPromotionController(MovieBookingContext context) : base(context) { }

    public class PromotionRequest
    {
        public string Code { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal DiscountPercent { get; set; }
        public string StartDate { get; set; } = string.Empty;
        public string EndDate { get; set; } = string.Empty;
        public bool Status { get; set; } = true;
    }

    [HttpGet("promotions")]
    public async Task<IActionResult> GetPromotions()
    {
        var promotions = await _context.Promotions
            .Include(p => p.Bookings)
            .AsNoTracking()
            .OrderByDescending(p => p.PromotionId)
            .Select(p => new
            {
                id = p.PromotionId,
                code = p.Code,
                description = p.Description ?? "",
                discountPercent = p.DiscountPercent,
                startDate = p.StartDate.ToString("yyyy-MM-dd"),
                endDate = p.EndDate.ToString("yyyy-MM-dd"),
                status = p.Status,
                usedCount = p.Bookings.Count
            })
            .ToListAsync();

        return Ok(promotions);
    }

    [HttpPost("promotions")]
    public async Task<IActionResult> CreatePromotion([FromBody] PromotionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
            return BadRequest(new { message = "Mã khuyến mãi không được để trống." });

        if (request.DiscountPercent <= 0 || request.DiscountPercent > 100)
            return BadRequest(new { message = "Phần trăm giảm giá phải từ 1 đến 100." });

        if (!DateOnly.TryParse(request.StartDate, out var startDate) ||
            !DateOnly.TryParse(request.EndDate, out var endDate))
        {
            return BadRequest(new { message = "Định dạng ngày bắt đầu hoặc kết thúc không hợp lệ." });
        }

        if (endDate < startDate)
            return BadRequest(new { message = "Ngày kết thúc phải sau ngày bắt đầu." });

        var code = request.Code.Trim().ToUpper();
        if (await _context.Promotions.AnyAsync(p => p.Code == code))
            return Conflict(new { message = "Mã khuyến mãi này đã tồn tại." });

        var promo = new Promotion
        {
            Code = code,
            Description = request.Description?.Trim(),
            DiscountPercent = request.DiscountPercent,
            StartDate = startDate,
            EndDate = endDate,
            Status = request.Status
        };

        _context.Promotions.Add(promo);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Thêm mã khuyến mãi thành công!", id = promo.PromotionId });
    }

    [HttpPut("promotions/{id}")]
    public async Task<IActionResult> UpdatePromotion(int id, [FromBody] PromotionRequest request)
    {
        var promo = await _context.Promotions.FindAsync(id);
        if (promo == null) return NotFound(new { message = "Không tìm thấy mã khuyến mãi." });

        if (request.DiscountPercent <= 0 || request.DiscountPercent > 100)
            return BadRequest(new { message = "Phần trăm giảm giá không hợp lệ." });

        if (!DateOnly.TryParse(request.StartDate, out var startDate) ||
            !DateOnly.TryParse(request.EndDate, out var endDate))
        {
            return BadRequest(new { message = "Định dạng ngày không hợp lệ." });
        }

        promo.Description = request.Description?.Trim();
        promo.DiscountPercent = request.DiscountPercent;
        promo.StartDate = startDate;
        promo.EndDate = endDate;
        promo.Status = request.Status;

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Cập nhật khuyến mãi thành công!" });
    }

    [HttpPatch("promotions/{id}/toggle")]
    public async Task<IActionResult> TogglePromotion(int id)
    {
        var promo = await _context.Promotions.FindAsync(id);
        if (promo == null) return NotFound(new { message = "Không tìm thấy khuyến mãi." });

        promo.Status = !promo.Status;
        await _context.SaveChangesAsync();
        return Ok(new { success = true, id = promo.PromotionId, status = promo.Status });
    }

    [HttpDelete("promotions/{id}")]
    public async Task<IActionResult> DeletePromotion(int id)
    {
        var promo = await _context.Promotions.Include(p => p.Bookings).FirstOrDefaultAsync(p => p.PromotionId == id);
        if (promo == null) return NotFound(new { message = "Không tìm thấy khuyến mãi." });

        if (promo.Bookings.Count > 0)
        {
            promo.Status = false;
            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Mã khuyến mãi đã có lượt sử dụng, đã chuyển sang trạng thái ngưng hoạt động." });
        }

        _context.Promotions.Remove(promo);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Xóa mã khuyến mãi thành công!" });
    }
}
