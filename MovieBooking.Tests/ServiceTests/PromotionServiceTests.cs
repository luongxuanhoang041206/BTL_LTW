using Microsoft.EntityFrameworkCore;
using MovieBooking.DTOs.Promotion;
using MovieBooking.Models;
using MovieBooking.Services;
using MovieBooking.Tests.Helpers;

namespace MovieBooking.Tests.ServiceTests;

public class PromotionServiceTests
{
    // 1. Mã hết hạn hoặc hết lượt bị từ chối, không tạo thêm lượt dùng.
    [Theory]
    [InlineData("expired")]
    [InlineData("usage-limit")]
    public async Task CalculatePromotionAsync_ExpiredOrExhaustedPromotion_IsRejected(string scenario)
    {
        using var testDb = new SqliteTestDatabase();
        var seed = await PaymentServiceSeedHelper.SeedAsync(testDb.Context);
        var today = DateOnly.FromDateTime(DateTime.Today);
        var expired = scenario == "expired";
        var promotion = new Promotion
        {
            Code = "LIMITED",
            DiscountPercent = 0,
            DiscountType = "fixed",
            DiscountValue = 20m,
            PromotionScope = "all",
            MinOrderAmount = 0,
            UsageLimit = expired ? null : 1,
            StartDate = today.AddDays(-10),
            EndDate = expired ? today.AddDays(-1) : today,
            Status = true
        };
        testDb.Context.Promotions.Add(promotion);
        await testDb.Context.SaveChangesAsync();

        if (!expired)
        {
            testDb.Context.PromotionUsages.Add(new PromotionUsage
            {
                PromotionId = promotion.PromotionId,
                UserId = seed.UserId,
                BookingId = seed.BookingId,
                PromotionCode = promotion.Code,
                DiscountType = promotion.DiscountType,
                DiscountValue = promotion.DiscountValue,
                PromotionScope = promotion.PromotionScope,
                EligibleAmount = 100m,
                DiscountAmount = 20m,
                RedeemedAt = DateTime.Now
            });
            await testDb.Context.SaveChangesAsync();
        }

        var usageCountBefore = await testDb.Context.PromotionUsages
            .CountAsync(x => x.PromotionId == promotion.PromotionId);
        var result = await new PromotionService(testDb.Context)
            .CalculatePromotionAsync(promotion.Code, seed.UserId, 100m, 0m, 0m);
        var usageCountAfter = await testDb.Context.PromotionUsages
            .CountAsync(x => x.PromotionId == promotion.PromotionId);

        Assert.False(result.Valid);
        Assert.Equal(0m, result.DiscountAmount);
        Assert.Equal(usageCountBefore, usageCountAfter);
    }

    // 2. Mức giảm vượt tổng đơn chỉ giảm tối đa bằng tổng đơn và tổng tiền không âm.
    [Fact]
    public async Task CalculatePromotionAsync_DiscountExceedsOrder_ClampsTotalAtZero()
    {
        using var testDb = new SqliteTestDatabase();
        var seed = await PaymentServiceSeedHelper.SeedAsync(testDb.Context);
        var today = DateOnly.FromDateTime(DateTime.Today);
        var promotion = new Promotion
        {
            Code = "MAXIMUM",
            DiscountPercent = 0,
            DiscountType = "fixed",
            DiscountValue = 250m,
            PromotionScope = "all",
            MinOrderAmount = 0,
            StartDate = today.AddDays(-1),
            EndDate = today.AddDays(1),
            Status = true
        };
        testDb.Context.Promotions.Add(promotion);
        await testDb.Context.SaveChangesAsync();

        var result = await new PromotionService(testDb.Context)
            .CalculatePromotionAsync(promotion.Code, seed.UserId, 80m, 15m, 5m);

        Assert.True(result.Valid);
        Assert.Equal(100m, result.OrderAmount);
        Assert.Equal(100m, result.DiscountAmount);
        Assert.True(result.DiscountAmount <= result.OrderAmount);
        Assert.Equal(0m, result.TotalAmount);
        Assert.True(result.TotalAmount >= 0m);
    }
}
