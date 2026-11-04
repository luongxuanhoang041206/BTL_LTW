using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.DTOs;
using MovieBooking.Models;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Services;

public sealed class PromotionService(MovieBookingContext context) : IPromotionService
{
    public async Task<List<AdminPromotionDto>> GetPromotionsAsync() => await context.Promotions
        .AsNoTracking()
        .OrderByDescending(promotion => promotion.PromotionId)
        .Select(promotion => new AdminPromotionDto(
            promotion.PromotionId,
            promotion.Code,
            promotion.Description ?? "",
            promotion.DiscountPercent,
            promotion.StartDate.ToString("yyyy-MM-dd"),
            promotion.EndDate.ToString("yyyy-MM-dd"),
            promotion.Status,
            promotion.Bookings.Count))
        .ToListAsync();

    public async Task<PaginationResponseDto<AdminPromotionDto>> GetPromotionsPagedAsync(AdminPromotionQueryDto query)
    {
        var q = context.Promotions.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Keyword))
        {
            var kw = query.Keyword.Trim().ToLower();
            q = q.Where(p => p.Code.ToLower().Contains(kw) ||
                              (p.Description != null && p.Description.ToLower().Contains(kw)));
        }

        if (query.Status.HasValue)
            q = q.Where(p => p.Status == query.Status.Value);

        var today = DateOnly.FromDateTime(DateTime.Today);
        if (!string.IsNullOrWhiteSpace(query.FromDate) && DateOnly.TryParse(query.FromDate, out var from))
            q = q.Where(p => p.EndDate >= from);
        if (!string.IsNullOrWhiteSpace(query.ToDate) && DateOnly.TryParse(query.ToDate, out var to))
            q = q.Where(p => p.StartDate <= to);

        q = (query.SortBy?.ToLower(), query.SortOrder?.ToLower()) switch
        {
            ("code", "asc")          => q.OrderBy(p => p.Code),
            ("code", _)              => q.OrderByDescending(p => p.Code),
            ("discountpercent", "asc") => q.OrderBy(p => p.DiscountPercent),
            ("discountpercent", _)   => q.OrderByDescending(p => p.DiscountPercent),
            ("enddate", "asc")       => q.OrderBy(p => p.EndDate),
            ("enddate", _)           => q.OrderByDescending(p => p.EndDate),
            (_, "asc")               => q.OrderBy(p => p.PromotionId),
            _                        => q.OrderByDescending(p => p.PromotionId),
        };

        var totalItems = await q.CountAsync();
        var pageSize   = Math.Clamp(query.PageSize, 1, 100);
        var page       = Math.Max(query.Page, 1);
        var totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);

        var data = await q
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new AdminPromotionDto(
                p.PromotionId,
                p.Code,
                p.Description ?? "",
                p.DiscountPercent,
                p.StartDate.ToString("yyyy-MM-dd"),
                p.EndDate.ToString("yyyy-MM-dd"),
                p.Status,
                p.Bookings.Count))
            .ToListAsync();

        return new PaginationResponseDto<AdminPromotionDto>
        {
            Data = data, CurrentPage = page, PageSize = pageSize,
            TotalItems = totalItems, TotalPages = totalPages,
        };
    }

    public async Task<AdminPromotionSummaryDto> GetPromotionSummaryAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var all = await context.Promotions
            .AsNoTracking()
            .Select(p => new { p.Status, p.StartDate, p.EndDate })
            .ToListAsync();

        return new AdminPromotionSummaryDto
        {
            Total    = all.Count,
            Active   = all.Count(p => p.Status && p.StartDate <= today && p.EndDate >= today),
            Upcoming = all.Count(p => p.Status && p.StartDate > today),
            Expired  = all.Count(p => p.EndDate < today),
            Inactive = all.Count(p => !p.Status),
        };
    }

    public async Task<(bool Success, bool Conflict, string? Error, int? Id)> CreatePromotionAsync(PromotionFormDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
            return (false, false, "Mã khuyến mãi không được để trống.", null);
        if (request.DiscountPercent <= 0 || request.DiscountPercent > 100)
            return (false, false, "Phần trăm giảm giá phải từ 1 đến 100.", null);
        if (!DateOnly.TryParse(request.StartDate, out var startDate) || !DateOnly.TryParse(request.EndDate, out var endDate))
            return (false, false, "Định dạng ngày bắt đầu hoặc kết thúc không hợp lệ.", null);
        if (endDate < startDate)
            return (false, false, "Ngày kết thúc phải sau ngày bắt đầu.", null);

        var code = request.Code.Trim().ToUpper();
        if (await context.Promotions.AnyAsync(promotion => promotion.Code == code))
            return (false, true, "Mã khuyến mãi này đã tồn tại.", null);

        var promotion = new Promotion
        {
            Code = code,
            Description = request.Description?.Trim(),
            DiscountPercent = request.DiscountPercent,
            StartDate = startDate,
            EndDate = endDate,
            Status = request.Status
        };
        context.Promotions.Add(promotion);
        await context.SaveChangesAsync();
        return (true, false, null, promotion.PromotionId);
    }

    public async Task<(bool Success, bool NotFound, string? Error)> UpdatePromotionAsync(int id, PromotionFormDto request)
    {
        var promotion = await context.Promotions.FindAsync(id);
        if (promotion == null) return (false, true, null);
        if (request.DiscountPercent <= 0 || request.DiscountPercent > 100)
            return (false, false, "Phần trăm giảm giá không hợp lệ.");
        if (!DateOnly.TryParse(request.StartDate, out var startDate) || !DateOnly.TryParse(request.EndDate, out var endDate))
            return (false, false, "Định dạng ngày không hợp lệ.");

        promotion.Description = request.Description?.Trim();
        promotion.DiscountPercent = request.DiscountPercent;
        promotion.StartDate = startDate;
        promotion.EndDate = endDate;
        promotion.Status = request.Status;
        await context.SaveChangesAsync();
        return (true, false, null);
    }

    public async Task<(bool Found, bool Status)> TogglePromotionAsync(int id)
    {
        var promotion = await context.Promotions.FindAsync(id);
        if (promotion == null) return (false, false);
        promotion.Status = !promotion.Status;
        await context.SaveChangesAsync();
        return (true, promotion.Status);
    }

    public async Task<(bool Found, bool Archived)> DeletePromotionAsync(int id)
    {
        var promotion = await context.Promotions
            .Include(promotion => promotion.Bookings)
            .FirstOrDefaultAsync(promotion => promotion.PromotionId == id);
        if (promotion == null) return (false, false);
        if (promotion.Bookings.Count > 0)
        {
            promotion.Status = false;
            await context.SaveChangesAsync();
            return (true, true);
        }

        context.Promotions.Remove(promotion);
        await context.SaveChangesAsync();
        return (true, false);
    }
}
