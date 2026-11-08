using Microsoft.EntityFrameworkCore;
using Moq;
using MovieBooking.Data;
using MovieBooking.DTOs;
using MovieBooking.Models;
using MovieBooking.Services;
using MovieBooking.Services.Interfaces;
using MovieBooking.Tests.Helpers;

namespace MovieBooking.Tests.ServiceTests;

[Collection("SqlServer")]
public class BookingCheckoutConcurrencyTests
{
    private readonly SqlServerFixture _fixture;

    public BookingCheckoutConcurrencyTests(SqlServerFixture fixture)
    {
        _fixture = fixture;
    }

    private static BookingService CreateBookingService(MovieBookingContext db)
    {
        var settings = new Mock<ISystemSettingsService>();
        settings.Setup(service => service.GetAsync()).ReturnsAsync(new SystemSettingsDto());
        return new BookingService(db, settings.Object, new Mock<IPromotionService>().Object);
    }

    private static BookingCheckoutService CreateCheckoutService(MovieBookingContext db)
    {
        var foods = new Mock<IFoodService>();
        foods.Setup(service => service.ValidateAndCalculateFoodsAsync(
                It.IsAny<List<BookingFoodItemRequest>?>()))
            .ReturnsAsync((true, 0m, (string?)null));
        return new BookingCheckoutService(db, CreateBookingService(db), foods.Object);
    }

    // 1. Hai checkout đồng thời cùng ghế chỉ tạo một booking cho một user.
    [Fact]
    public async Task CheckoutAsync_ConcurrentUsersSameSeat_CreatesOneBooking()
    {
        await _fixture.ResetAsync();
        BookingScenarioSeed seed;
        int secondUserId;
        await using (var seedDb = _fixture.CreateContext())
        {
            seed = await PaymentServiceSeedHelper.SeedBookingScenarioAsync(seedDb, seatHeldByOwner: false);
            secondUserId = await PaymentServiceSeedHelper.SeedAdditionalUserAsync(seedDb);
        }

        var barrier = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        var arrived = 0;
        var request = new ApiCheckoutRequestDto
        {
            ShowtimeId = seed.ShowtimeId,
            SeatIds = [seed.SeatId]
        };

        async Task<BookingCheckoutResult> CheckoutAsync(int userId)
        {
            await using var db = _fixture.CreateContext();
            var checkout = CreateCheckoutService(db);
            if (Interlocked.Increment(ref arrived) == 2)
                barrier.SetResult(true);
            await barrier.Task.WaitAsync(TimeSpan.FromSeconds(15));
            return await checkout.CheckoutAsync(request, userId);
        }

        var results = await Task.WhenAll(
            CheckoutAsync(seed.UserId),
            CheckoutAsync(secondUserId));

        Assert.Single(results.Where(result => result.Success));
        Assert.Single(results.Where(result => !result.Success));

        await using var verifyDb = _fixture.CreateContext();
        var bookingDetail = await verifyDb.BookingDetails.AsNoTracking()
            .SingleAsync(detail => detail.ShowtimeSeatId == seed.ShowtimeSeatId);
        var booking = await verifyDb.Bookings.AsNoTracking()
            .SingleAsync(item => item.BookingId == bookingDetail.BookingId);
        Assert.Contains(booking.UserId, new[] { seed.UserId, secondUserId });
    }

    // 2. Checkout bị từ chối khi ghế còn hạn đang do user khác giữ.
    [Fact]
    public async Task CheckoutAsync_SeatHeldByAnotherUser_RejectsAndPreservesOwner()
    {
        await _fixture.ResetAsync();
        BookingScenarioSeed seed;
        int otherUserId;
        await using (var db = _fixture.CreateContext())
        {
            seed = await PaymentServiceSeedHelper.SeedBookingScenarioAsync(db, seatHeldByOwner: true);
            otherUserId = await PaymentServiceSeedHelper.SeedAdditionalUserAsync(db);
        }

        BookingCheckoutResult result;
        await using (var db = _fixture.CreateContext())
        {
            var request = new ApiCheckoutRequestDto
            {
                ShowtimeId = seed.ShowtimeId,
                SeatIds = [seed.SeatId]
            };
            result = await CreateCheckoutService(db).CheckoutAsync(request, otherUserId);
        }

        Assert.False(result.Success);
        await using var verifyDb = _fixture.CreateContext();
        var seat = await verifyDb.ShowtimeSeats.AsNoTracking()
            .SingleAsync(item => item.ShowtimeSeatId == seed.ShowtimeSeatId);
        Assert.Equal("Holding", seat.Status);
        Assert.Equal(seed.UserId, seat.LockedByUserId);
        Assert.True(seat.HoldExpiresAt > DateTime.Now);
        Assert.Empty(await verifyDb.BookingDetails.AsNoTracking()
            .Where(item => item.ShowtimeSeatId == seed.ShowtimeSeatId).ToListAsync());
    }

    // 3. Tổng tiền gồm vé và đồ ăn, giảm giá không làm tổng tiền âm.
    [Fact]
    public async Task ConfirmBookingAsync_TotalIncludesFoodAndDiscount_ClampsAtZero()
    {
        await _fixture.ResetAsync();
        BookingScenarioSeed seed;
        await using (var db = _fixture.CreateContext())
        {
            seed = await PaymentServiceSeedHelper.SeedBookingScenarioAsync(db, seatHeldByOwner: true);
            var today = DateOnly.FromDateTime(DateTime.Today);
            db.Promotions.Add(new Promotion
            {
                Code = "MAXDISC",
                DiscountPercent = 0,
                DiscountType = "fixed",
                DiscountValue = 100m,
                PromotionScope = "all",
                MinOrderAmount = 0,
                StartDate = today,
                EndDate = today,
                Status = true
            });
            await db.SaveChangesAsync();

            var settings = new Mock<ISystemSettingsService>();
            settings.Setup(service => service.GetAsync()).ReturnsAsync(new SystemSettingsDto());
            var promotionService = new PromotionService(db);
            var bookingService = new BookingService(db, settings.Object, promotionService);
            var result = await bookingService.ConfirmBookingAsync(
                seed.ShowtimeId,
                [seed.ShowtimeSeatId],
                seed.UserId,
                "MAXDISC",
                foodsAmount: 10m);

            Assert.True(result.Success);
            Assert.NotNull(result.BookingId);
        }

        await using var verifyDb = _fixture.CreateContext();
        var booking = await verifyDb.Bookings.AsNoTracking().SingleAsync();
        Assert.Equal(35m, booking.SubtotalAmount);
        Assert.Equal(35m, booking.DiscountAmount);
        Assert.Equal(0m, booking.TotalAmount);
        Assert.True(booking.TotalAmount >= 0m);
    }
}
