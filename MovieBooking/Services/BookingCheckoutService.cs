using Microsoft.EntityFrameworkCore;
using System.Data;
using MovieBooking.Data;
using MovieBooking.DTOs;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Services;

public sealed class BookingCheckoutService(
    MovieBookingContext context,
    IBookingService bookingService,
    IFoodService foodService) : IBookingCheckoutService
{
    public async Task<BookingCheckoutResult> CheckoutAsync(ApiCheckoutRequestDto request, int userId)
    {
        await using var transaction = await context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

        if (request.Combos is { Count: > 0 })
        {
            var (valid, _, _, error) = await foodService.ValidateAndCalculateCombosAsync(request.Combos);
            if (!valid)
                return new BookingCheckoutResult(false, null, error ?? "Combo bắp nước không hợp lệ.", true);
        }

        var foodValidation = await foodService.ValidateAndCalculateFoodsAsync(request.Foods);
        if (!foodValidation.Success)
            return new BookingCheckoutResult(false, null, foodValidation.Error, true);

        var seatMap = await bookingService.GetSeatMapAsync(request.ShowtimeId, userId);
        if (seatMap == null)
            return new BookingCheckoutResult(false, null, "Không tìm thấy suất chiếu.", false);

        var showtimeSeatIds = new List<int>();
        foreach (var row in seatMap.Rows)
        foreach (var seat in row.Seats)
        {
            if (!request.SeatIds.Contains(seat.SeatId)) continue;
            if (!seat.IsHeldByCurrentUser && seat.Status == "Available")
                await bookingService.HoldSeatsAsync(request.ShowtimeId, new List<int> { seat.SeatId }, userId);
            showtimeSeatIds.Add(seat.ShowtimeSeatId);
        }

        if (showtimeSeatIds.Count == 0)
            return new BookingCheckoutResult(false, null, "Không tìm thấy thông tin ghế đã chọn.", false);

        var (confirmSuccess, bookingId, confirmError) = await bookingService.ConfirmBookingAsync(
            request.ShowtimeId, showtimeSeatIds, userId, request.PromoCode);
        if (!confirmSuccess || bookingId == null)
            return new BookingCheckoutResult(false, null, confirmError ?? "Đặt vé thất bại.", true);

        if (request.Combos is { Count: > 0 })
        {
            var (saved, error) = await foodService.SaveBookingCombosAsync(bookingId.Value, request.Combos);
            if (!saved)
                return new BookingCheckoutResult(false, null, error ?? "Lỗi lưu thông tin combo.", true);
        }

        if (request.Foods is { Count: > 0 })
        {
            var saved = await foodService.SaveBookingFoodsAsync(bookingId.Value, request.Foods);
            if (!saved.Success)
                return new BookingCheckoutResult(false, null, saved.Error ?? "Lỗi lưu thông tin món ăn.", true);
        }

        await transaction.CommitAsync();
        return new BookingCheckoutResult(true, bookingId.Value, null, false);
    }
}
