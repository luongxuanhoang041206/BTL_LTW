using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.DTOs;
using MovieBooking.DTOs.Promotion;
using MovieBooking.Models;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Services;

public sealed class PromotionService(MovieBookingContext context) : IPromotionService
{
    private static readonly string[] DiscountTypes = { "percent", "fixed" };
    private static readonly string[] Scopes = { "all", "tickets", "foods", "combos" };

    // =====================================================================
    // ADMIN — LIST / SUMMARY / DETAIL
    // =====================================================================

    private IQueryable<AdminPromotionDto> ProjectAdmin(IQueryable<Promotion> q, DateTime now) =>
        q.Select(p => new AdminPromotionDto
        {
            Id = p.PromotionId,
            Code = p.Code,
            Description = p.Description ?? "",
            DiscountType = p.DiscountType,
            DiscountValue = p.DiscountValue,
            DiscountPercent = p.DiscountPercent,
            PromotionScope = p.PromotionScope,
            MinOrderAmount = p.MinOrderAmount,
            MaxDiscountAmount = p.MaxDiscountAmount,
            UsageLimit = p.UsageLimit,
            UsageLimitPerUser = p.UsageLimitPerUser,
            StartDate = p.StartDate.ToString("yyyy-MM-dd"),
            EndDate = p.EndDate.ToString("yyyy-MM-dd"),
            Status = p.Status,
            UsedCount = context.PromotionUsages.Count(u => u.PromotionId == p.PromotionId),
            HeldCount = context.PromotionRedemptions.Count(r =>
                r.PromotionId == p.PromotionId && r.Status == "Reserved" && r.ExpiresAt > now),
        });

    public async Task<List<AdminPromotionDto>> GetPromotionsAsync()
    {
        var now = DateTime.Now;
        var data = await ProjectAdmin(
                context.Promotions.AsNoTracking().OrderByDescending(p => p.PromotionId), now)
            .ToListAsync();
        foreach (var d in data) FillRemaining(d);
        return data;
    }

    public async Task<PaginationResponseDto<AdminPromotionDto>> GetPromotionsPagedAsync(AdminPromotionQueryDto query)
    {
        var now = DateTime.Now;
        var q = context.Promotions.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Keyword))
        {
            var kw = query.Keyword.Trim().ToLower();
            q = q.Where(p => p.Code.ToLower().Contains(kw) ||
                             (p.Description != null && p.Description.ToLower().Contains(kw)));
        }

        if (query.Status.HasValue)
            q = q.Where(p => p.Status == query.Status.Value);

        if (!string.IsNullOrWhiteSpace(query.DiscountType))
        {
            var dt = query.DiscountType.Trim().ToLower();
            q = q.Where(p => p.DiscountType == dt);
        }

        if (!string.IsNullOrWhiteSpace(query.PromotionScope))
        {
            var sc = query.PromotionScope.Trim().ToLower();
            q = q.Where(p => p.PromotionScope == sc);
        }

        if (!string.IsNullOrWhiteSpace(query.FromDate) && DateOnly.TryParse(query.FromDate, out var from))
            q = q.Where(p => p.EndDate >= from);
        if (!string.IsNullOrWhiteSpace(query.ToDate) && DateOnly.TryParse(query.ToDate, out var to))
            q = q.Where(p => p.StartDate <= to);

        q = (query.SortBy?.ToLower(), query.SortOrder?.ToLower()) switch
        {
            ("code", "asc")           => q.OrderBy(p => p.Code),
            ("code", _)               => q.OrderByDescending(p => p.Code),
            ("discountvalue", "asc")  => q.OrderBy(p => p.DiscountValue),
            ("discountvalue", _)      => q.OrderByDescending(p => p.DiscountValue),
            ("enddate", "asc")        => q.OrderBy(p => p.EndDate),
            ("enddate", _)            => q.OrderByDescending(p => p.EndDate),
            (_, "asc")                => q.OrderBy(p => p.PromotionId),
            _                         => q.OrderByDescending(p => p.PromotionId),
        };

        var totalItems = await q.CountAsync();
        var pageSize   = Math.Clamp(query.PageSize, 1, 100);
        var page       = Math.Max(query.Page, 1);
        var totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);

        var data = await ProjectAdmin(q.Skip((page - 1) * pageSize).Take(pageSize), now).ToListAsync();
        foreach (var d in data) FillRemaining(d);

        return new PaginationResponseDto<AdminPromotionDto>
        {
            Data = data, CurrentPage = page, PageSize = pageSize,
            TotalItems = totalItems, TotalPages = totalPages,
        };
    }

    private static void FillRemaining(AdminPromotionDto d) =>
        d.RemainingUses = d.UsageLimit.HasValue
            ? Math.Max(0, d.UsageLimit.Value - d.UsedCount - d.HeldCount)
            : null;

    public async Task<AdminPromotionSummaryDto> GetPromotionSummaryAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var all = await context.Promotions.AsNoTracking()
            .Select(p => new { p.Status, p.StartDate, p.EndDate })
            .ToListAsync();

        var redeemed = await context.PromotionUsages.AsNoTracking()
            .GroupBy(_ => 1)
            .Select(g => new { Count = g.Count(), Total = g.Sum(u => (decimal?)u.DiscountAmount) ?? 0m })
            .FirstOrDefaultAsync();

        return new AdminPromotionSummaryDto
        {
            Total    = all.Count,
            Active   = all.Count(p => p.Status && p.StartDate <= today && p.EndDate >= today),
            Upcoming = all.Count(p => p.Status && p.StartDate > today),
            Expired  = all.Count(p => p.EndDate < today),
            Inactive = all.Count(p => !p.Status),
            TotalRedeemed = redeemed?.Count ?? 0,
            TotalDiscountAmount = redeemed?.Total ?? 0m,
        };
    }

    public async Task<PromotionDetailDto?> GetPromotionByIdAsync(int id)
    {
        var p = await context.Promotions.AsNoTracking()
            .FirstOrDefaultAsync(x => x.PromotionId == id);
        if (p == null) return null;

        var now = DateTime.Now;
        var used = await context.PromotionUsages.AsNoTracking()
            .Where(u => u.PromotionId == id)
            .GroupBy(_ => 1)
            .Select(g => new { Count = g.Count(), Total = g.Sum(u => (decimal?)u.DiscountAmount) ?? 0m })
            .FirstOrDefaultAsync();
        var held = await context.PromotionRedemptions.AsNoTracking()
            .CountAsync(r => r.PromotionId == id && r.Status == "Reserved" && r.ExpiresAt > now);

        var usedCount = used?.Count ?? 0;
        return new PromotionDetailDto
        {
            Id = p.PromotionId,
            Code = p.Code,
            Description = p.Description,
            DiscountType = p.DiscountType,
            DiscountValue = p.DiscountValue,
            PromotionScope = p.PromotionScope,
            MinOrderAmount = p.MinOrderAmount,
            MaxDiscountAmount = p.MaxDiscountAmount,
            UsageLimit = p.UsageLimit,
            UsageLimitPerUser = p.UsageLimitPerUser,
            StartDate = p.StartDate.ToString("yyyy-MM-dd"),
            EndDate = p.EndDate.ToString("yyyy-MM-dd"),
            Status = p.Status,
            TotalUsed = usedCount,
            Held = held,
            RemainingUses = p.UsageLimit.HasValue ? Math.Max(0, p.UsageLimit.Value - usedCount - held) : null,
            TotalDiscountAmount = used?.Total ?? 0m,
            History = await GetPromotionUsageAsync(id),
        };
    }

    public async Task<List<PromotionUsageDto>> GetPromotionUsageAsync(int id)
    {
        var redemptions = await context.PromotionRedemptions.AsNoTracking()
            .Include(r => r.User)
            .Where(r => r.PromotionId == id)
            .OrderByDescending(r => r.RedemptionId)
            .ToListAsync();

        var usages = await context.PromotionUsages.AsNoTracking()
            .Where(u => u.PromotionId == id)
            .ToDictionaryAsync(u => u.BookingId);

        var promotion = await context.Promotions.AsNoTracking()
            .FirstOrDefaultAsync(p => p.PromotionId == id);

        return redemptions.Select(r =>
        {
            usages.TryGetValue(r.BookingId, out var usage);
            return new PromotionUsageDto
            {
                RedemptionId = r.RedemptionId,
                BookingId = r.BookingId,
                BookingCode = "MB-" + r.BookingId.ToString("D6"),
                UserId = r.UserId,
                UserName = r.User?.FullName ?? "",
                UserEmail = r.User?.Email ?? "",
                PromotionCode = r.PromotionCode,
                Status = r.Status,
                DiscountType = usage?.DiscountType ?? promotion?.DiscountType ?? "percent",
                DiscountValue = usage?.DiscountValue ?? promotion?.DiscountValue ?? 0m,
                PromotionScope = usage?.PromotionScope ?? promotion?.PromotionScope ?? "all",
                EligibleAmount = usage?.EligibleAmount ?? 0m,
                DiscountAmount = usage?.DiscountAmount ?? 0m,
                ReservedAt = r.ReservedAt,
                ExpiresAt = r.ExpiresAt,
                RedeemedAt = r.RedeemedAt,
                ReleasedAt = r.ReleasedAt,
            };
        }).ToList();
    }

    // =====================================================================
    // ADMIN — CREATE / UPDATE / TOGGLE / DELETE
    // =====================================================================

    private static string? ValidateForm(PromotionFormDto r, out string type, out string scope,
        out DateOnly start, out DateOnly end)
    {
        type = (r.DiscountType ?? "percent").Trim().ToLower();
        scope = (r.PromotionScope ?? "all").Trim().ToLower();
        start = default;
        end = default;

        if (string.IsNullOrWhiteSpace(r.Code))
            return "Mã khuyến mãi không được để trống.";
        if (r.Code.Trim().Length > 30)
            return "Mã khuyến mãi tối đa 30 ký tự.";
        if (!DiscountTypes.Contains(type))
            return "Loại giảm giá phải là 'percent' hoặc 'fixed'.";
        if (r.DiscountValue <= 0)
            return "Giá trị giảm phải lớn hơn 0.";
        if (type == "percent" && r.DiscountValue > 100)
            return "Giảm theo phần trăm không được vượt quá 100.";
        if (!Scopes.Contains(scope))
            return "Phạm vi áp dụng không hợp lệ.";
        if (r.MinOrderAmount < 0)
            return "Giá trị đơn tối thiểu không được âm.";
        if (r.MaxDiscountAmount.HasValue && r.MaxDiscountAmount.Value <= 0)
            return "Mức giảm tối đa phải lớn hơn 0.";
        if (r.UsageLimit.HasValue && r.UsageLimit.Value <= 0)
            return "Giới hạn lượt dùng phải lớn hơn 0.";
        if (r.UsageLimitPerUser.HasValue && r.UsageLimitPerUser.Value <= 0)
            return "Giới hạn lượt dùng mỗi người phải lớn hơn 0.";
        if (!DateOnly.TryParse(r.StartDate, out start) || !DateOnly.TryParse(r.EndDate, out end))
            return "Định dạng ngày bắt đầu hoặc kết thúc không hợp lệ.";
        if (end < start)
            return "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.";
        return null;
    }

    public async Task<(bool Success, bool Conflict, string? Error, int? Id)> CreatePromotionAsync(PromotionFormDto request)
    {
        var error = ValidateForm(request, out var type, out var scope, out var start, out var end);
        if (error != null) return (false, false, error, null);

        var code = request.Code.Trim().ToUpper();
        if (await context.Promotions.AnyAsync(p => p.Code == code))
            return (false, true, "Mã khuyến mãi này đã tồn tại.", null);

        var promotion = new Promotion
        {
            Code = code,
            Description = request.Description?.Trim(),
            DiscountType = type,
            DiscountValue = r2(request.DiscountValue),
            DiscountPercent = type == "percent" ? r2(request.DiscountValue) : 0m,
            PromotionScope = scope,
            MinOrderAmount = r2(request.MinOrderAmount),
            MaxDiscountAmount = request.MaxDiscountAmount.HasValue ? r2(request.MaxDiscountAmount.Value) : null,
            UsageLimit = request.UsageLimit,
            UsageLimitPerUser = request.UsageLimitPerUser,
            StartDate = start,
            EndDate = end,
            Status = request.Status,
        };
        context.Promotions.Add(promotion);
        try
        {
            await context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return (false, true, "Mã khuyến mãi này đã tồn tại.", null);
        }
        return (true, false, null, promotion.PromotionId);
    }

    public async Task<(bool Success, bool NotFound, string? Error)> UpdatePromotionAsync(int id, PromotionFormDto request)
    {
        var promotion = await context.Promotions.FindAsync(id);
        if (promotion == null) return (false, true, null);

        var error = ValidateForm(request, out var type, out var scope, out var start, out var end);
        if (error != null) return (false, false, error);

        promotion.Description = request.Description?.Trim();
        promotion.DiscountType = type;
        promotion.DiscountValue = r2(request.DiscountValue);
        promotion.DiscountPercent = type == "percent" ? r2(request.DiscountValue) : 0m;
        promotion.PromotionScope = scope;
        promotion.MinOrderAmount = r2(request.MinOrderAmount);
        promotion.MaxDiscountAmount = request.MaxDiscountAmount.HasValue ? r2(request.MaxDiscountAmount.Value) : null;
        promotion.UsageLimit = request.UsageLimit;
        promotion.UsageLimitPerUser = request.UsageLimitPerUser;
        promotion.StartDate = start;
        promotion.EndDate = end;
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
        var promotion = await context.Promotions.FindAsync(id);
        if (promotion == null) return (false, false);

        var hasHistory = await context.PromotionUsages.AnyAsync(u => u.PromotionId == id)
            || await context.PromotionRedemptions.AnyAsync(r => r.PromotionId == id)
            || await context.Bookings.AnyAsync(b => b.PromotionId == id);
        if (hasHistory)
        {
            promotion.Status = false;
            await context.SaveChangesAsync();
            return (true, true);
        }

        context.Promotions.Remove(promotion);
        await context.SaveChangesAsync();
        return (true, false);
    }

    // =====================================================================
    // CUSTOMER — AVAILABLE LIST / PREVIEW / CALCULATE
    // =====================================================================

    public async Task<List<AvailablePromotionDto>> GetAvailablePromotionsAsync(int userId)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var now = DateTime.Now;

        var candidates = await context.Promotions.AsNoTracking()
            .Where(p => p.Status && p.StartDate <= today && p.EndDate >= today)
            .OrderBy(p => p.EndDate)
            .ToListAsync();

        var result = new List<AvailablePromotionDto>();
        foreach (var p in candidates)
        {
            var used = await context.PromotionUsages.AsNoTracking().CountAsync(u => u.PromotionId == p.PromotionId);
            var held = await context.PromotionRedemptions.AsNoTracking()
                .CountAsync(r => r.PromotionId == p.PromotionId && r.Status == "Reserved" && r.ExpiresAt > now);
            var committed = used + held;
            if (p.UsageLimit.HasValue && committed >= p.UsageLimit.Value) continue;

            if (p.UsageLimitPerUser.HasValue)
            {
                var userUsed = await context.PromotionUsages.AsNoTracking()
                    .CountAsync(u => u.PromotionId == p.PromotionId && u.UserId == userId);
                var userHeld = await context.PromotionRedemptions.AsNoTracking()
                    .CountAsync(r => r.PromotionId == p.PromotionId && r.UserId == userId
                                     && r.Status == "Reserved" && r.ExpiresAt > now);
                if (userUsed + userHeld >= p.UsageLimitPerUser.Value) continue;
            }

            result.Add(new AvailablePromotionDto
            {
                Code = p.Code,
                Description = p.Description,
                DiscountType = p.DiscountType,
                DiscountValue = p.DiscountValue,
                PromotionScope = p.PromotionScope,
                MinOrderAmount = p.MinOrderAmount,
                MaxDiscountAmount = p.MaxDiscountAmount,
                StartDate = p.StartDate.ToString("yyyy-MM-dd"),
                EndDate = p.EndDate.ToString("yyyy-MM-dd"),
                UsageLimit = p.UsageLimit,
                RemainingUses = p.UsageLimit.HasValue ? Math.Max(0, p.UsageLimit.Value - committed) : null,
            });
        }
        return result;
    }

    public Task<PromotionCalculationResultDto> PreviewPromotionAsync(PromotionPreviewRequestDto request, int userId) =>
        CalculatePromotionAsync(request.Code, userId, request.TicketsAmount, request.FoodsAmount, request.CombosAmount);

    public async Task<PromotionCalculationResultDto> CalculatePromotionAsync(
        string code, int userId, decimal ticketsAmount, decimal foodsAmount, decimal combosAmount)
    {
        decimal Norm(decimal v) => v < 0 ? 0 : v;
        ticketsAmount = Norm(ticketsAmount);
        foodsAmount = Norm(foodsAmount);
        combosAmount = Norm(combosAmount);
        var orderAmount = ticketsAmount + foodsAmount + combosAmount;

        PromotionCalculationResultDto Fail(string reason) => new()
        {
            Valid = false, Error = reason, OrderAmount = orderAmount,
        };

        if (string.IsNullOrWhiteSpace(code))
            return Fail("Mã giảm giá không được để trống.");

        var normalized = code.Trim().ToUpper();
        var promo = await context.Promotions.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Code == normalized);
        if (promo == null)
            return Fail("Mã giảm giá không tồn tại.");
        if (!promo.Status)
            return Fail("Mã giảm giá đã bị vô hiệu hóa.");

        var today = DateOnly.FromDateTime(DateTime.Today);
        if (today < promo.StartDate)
            return Fail($"Mã giảm giá chưa có hiệu lực (từ {promo.StartDate:dd/MM/yyyy}).");
        if (today > promo.EndDate)
            return Fail($"Mã giảm giá đã hết hạn (hết ngày {promo.EndDate:dd/MM/yyyy}).");

        var type = promo.DiscountType?.ToLower();
        var scope = promo.PromotionScope?.ToLower();
        if (type != "percent" && type != "fixed")
            return Fail("Mã giảm giá không hợp lệ (loại giảm).");
        if (promo.DiscountValue <= 0 || (type == "percent" && promo.DiscountValue > 100))
            return Fail("Mã giảm giá không hợp lệ (giá trị giảm).");
        if (scope != "all" && scope != "tickets" && scope != "foods" && scope != "combos")
            return Fail("Mã giảm giá không hợp lệ (phạm vi).");

        if (orderAmount < promo.MinOrderAmount)
            return Fail($"Đơn hàng tối thiểu {promo.MinOrderAmount:N0} ₫ để áp dụng mã này.");

        var eligible = scope switch
        {
            "tickets" => ticketsAmount,
            "foods"   => foodsAmount,
            "combos"  => combosAmount,
            _         => orderAmount,
        };
        if (eligible <= 0)
            return Fail("Mã không áp dụng cho sản phẩm trong đơn.");

        // ----- Usage limits (đọc trong transaction của caller để khóa range khi đặt vé) -----
        var now = DateTime.Now;
        var used = await context.PromotionUsages.CountAsync(u => u.PromotionId == promo.PromotionId);
        var held = await context.PromotionRedemptions.CountAsync(r =>
            r.PromotionId == promo.PromotionId && r.Status == "Reserved" && r.ExpiresAt > now);
        if (promo.UsageLimit.HasValue && used + held >= promo.UsageLimit.Value)
            return Fail("Mã giảm giá đã hết lượt sử dụng.");

        if (promo.UsageLimitPerUser.HasValue)
        {
            var userUsed = await context.PromotionUsages
                .CountAsync(u => u.PromotionId == promo.PromotionId && u.UserId == userId);
            var userHeld = await context.PromotionRedemptions.CountAsync(r =>
                r.PromotionId == promo.PromotionId && r.UserId == userId
                && r.Status == "Reserved" && r.ExpiresAt > now);
            if (userUsed + userHeld >= promo.UsageLimitPerUser.Value)
                return Fail("Bạn đã dùng hết lượt cho mã giảm giá này.");
        }

        // ----- Tính tiền giảm -----
        var raw = type == "percent"
            ? eligible * promo.DiscountValue / 100m
            : promo.DiscountValue;
        if (promo.MaxDiscountAmount.HasValue)
            raw = Math.Min(raw, promo.MaxDiscountAmount.Value);
        raw = Math.Min(raw, eligible);
        var discount = Math.Round(raw, 0);
        if (discount < 0) discount = 0;

        var total = orderAmount - discount;
        if (total < 0) total = 0;

        return new PromotionCalculationResultDto
        {
            Valid = true,
            PromotionId = promo.PromotionId,
            Code = promo.Code,
            DiscountType = type,
            DiscountValue = promo.DiscountValue,
            PromotionScope = scope,
            OrderAmount = orderAmount,
            EligibleAmount = eligible,
            DiscountAmount = discount,
            TotalAmount = total,
        };
    }

    // =====================================================================
    // REDEMPTION / USAGE LIFECYCLE
    // =====================================================================

    public async Task ReserveRedemptionAsync(int bookingId, int userId, Promotion promotion, DateTime expiresAt)
    {
        context.PromotionRedemptions.Add(new PromotionRedemption
        {
            PromotionId = promotion.PromotionId,
            UserId = userId,
            BookingId = bookingId,
            PromotionCode = promotion.Code,
            Status = "Reserved",
            ReservedAt = DateTime.Now,
            ExpiresAt = expiresAt,
        });
        await context.SaveChangesAsync();
    }

    public async Task RedeemForBookingAsync(int bookingId)
    {
        var redemption = await context.PromotionRedemptions
            .FirstOrDefaultAsync(r => r.BookingId == bookingId);
        if (redemption == null || redemption.Status == "Redeemed")
            return; // không dùng mã hoặc đã xử lý (idempotent)

        if (await context.PromotionUsages.AnyAsync(u => u.BookingId == bookingId))
        {
            redemption.Status = "Redeemed";
            redemption.RedeemedAt ??= DateTime.Now;
            await context.SaveChangesAsync();
            return;
        }

        var booking = await context.Bookings
            .Include(b => b.BookingDetails)
            .Include(b => b.BookingFoods)
            .Include(b => b.BookingCombos)
            .Include(b => b.Promotion)
            .FirstOrDefaultAsync(b => b.BookingId == bookingId);
        if (booking?.Promotion == null)
            return;

        var promo = booking.Promotion;
        var tickets = booking.BookingDetails.Sum(d => d.Price);
        var foods = booking.BookingFoods.Sum(f => f.UnitPrice * f.Quantity);
        var combos = booking.BookingCombos.Sum(c => c.UnitPrice * c.Quantity);
        var eligible = promo.PromotionScope.ToLower() switch
        {
            "tickets" => tickets,
            "foods"   => foods,
            "combos"  => combos,
            _         => tickets + foods + combos,
        };

        var now = DateTime.Now;
        redemption.Status = "Redeemed";
        redemption.RedeemedAt = now;

        context.PromotionUsages.Add(new PromotionUsage
        {
            PromotionId = promo.PromotionId,
            UserId = booking.UserId,
            BookingId = bookingId,
            PromotionCode = redemption.PromotionCode,
            DiscountType = promo.DiscountType,
            DiscountValue = promo.DiscountValue,
            PromotionScope = promo.PromotionScope,
            EligibleAmount = eligible,
            DiscountAmount = booking.DiscountAmount, // snapshot lúc đặt vé, không tính lại
            RedeemedAt = now,
        });
        await context.SaveChangesAsync();
    }

    public async Task ReleaseForBookingAsync(int bookingId)
    {
        var redemption = await context.PromotionRedemptions
            .FirstOrDefaultAsync(r => r.BookingId == bookingId);
        if (redemption == null || redemption.Status != "Reserved")
            return; // chỉ nhả lượt đang giữ; đã redeemed thì giữ nguyên
        redemption.Status = "Released";
        redemption.ReleasedAt = DateTime.Now;
        await context.SaveChangesAsync();
    }

    public async Task<int> ReleaseExpiredRedemptionsAsync()
    {
        var now = DateTime.Now;
        return await context.PromotionRedemptions
            .Where(r => r.Status == "Reserved" && r.ExpiresAt < now)
            .ExecuteUpdateAsync(s => s
                .SetProperty(r => r.Status, "Released")
                .SetProperty(r => r.ReleasedAt, now));
    }

    private static decimal r2(decimal v) => Math.Round(v, 2);
}