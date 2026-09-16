using System.Collections.Generic;
using System.Threading.Tasks;
using MovieBooking.DTOs;
using MovieBooking.Models;

namespace MovieBooking.Services.Interfaces;

public interface IBookingService
{
    // --- Showtime selection (entry point) ---

    /// <summary>Lấy danh sách suất chiếu của một phim, nhóm theo ngày.</summary>
    Task<ShowtimeSelectionViewModel?> GetShowtimeSelectionAsync(int movieId);

    // --- Seat map ---

    /// <summary>Giải phóng các ShowtimeSeat hết hạn hold của suất chiếu này.</summary>
    Task ReleaseExpiredHoldsAsync(int showtimeId);

    /// <summary>Lấy sơ đồ ghế cho một suất chiếu, kèm trạng thái từng ghế.</summary>
    Task<SeatMapViewModel?> GetSeatMapAsync(int showtimeId, int currentUserId);

    // --- Hold ---

    /// <summary>
    /// Giữ ghế cho user. Trả về (Success, Error).
    /// seatIds là danh sách SeatId (physical seat), không phải ShowtimeSeatId.
    /// </summary>
    Task<(bool Success, string? Error)> HoldSeatsAsync(int showtimeId, List<int> seatIds, int userId);

    // --- Confirm booking ---

    /// <summary>
    /// Tạo Booking + BookingDetails, đổi ShowtimeSeat sang Booked.
    /// showtimeSeatIds lấy từ Session (đã được hold).
    /// </summary>
    Task<(bool Success, int? BookingId, string? Error)> ConfirmBookingAsync(
        int showtimeId,
        List<int> showtimeSeatIds,
        int userId,
        string? promoCode);

    // --- Promo ---

    /// <summary>Validate mã giảm giá. Trả về (Valid, Promo, Error).</summary>
    Task<(bool Valid, Promotion? Promo, string? Error)> ValidatePromoAsync(string code);

    /// <summary>Tính tổng tiền sau khi áp dụng giảm giá.</summary>
    decimal CalculateTotal(decimal unitPrice, int seatCount, decimal discountPercent);

    // --- History / Detail ---

    /// <summary>Lấy danh sách booking của user, mới nhất trước.</summary>
    Task<List<BookingHistoryViewModel>> GetUserBookingsAsync(int userId);

    /// <summary>Lấy chi tiết một booking. Trả về null nếu không tồn tại hoặc không thuộc user.</summary>
    Task<BookingDetailViewModel?> GetBookingDetailAsync(int bookingId, int userId);

    // --- Cancel ---

    /// <summary>Hủy booking. Trả về (Success, Error).</summary>
    Task<(bool Success, string? Error)> CancelBookingAsync(int bookingId, int userId);

    // --- Payment support ---

    /// <summary>Lấy dữ liệu trang thanh toán. Trả về null nếu booking không hợp lệ.</summary>
    Task<PaymentViewModel?> GetPaymentViewModelAsync(int bookingId, int userId);

    /// <summary>Lấy dữ liệu trang thành công sau khi thanh toán xong.</summary>
    Task<BookingSuccessViewModel?> GetSuccessViewModelAsync(int bookingId, int userId);
}
