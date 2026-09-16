using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using MovieBooking.Models;

namespace MovieBooking.DTOs;

// ---------------------------------------------------------------------------
// SEAT MAP
// ---------------------------------------------------------------------------

/// <summary>Dữ liệu trang chọn ghế — toàn bộ sơ đồ của một suất chiếu.</summary>
public class SeatMapViewModel
{
    public int ShowtimeId { get; set; }
    public string MovieTitle { get; set; } = string.Empty;
    public string? PosterUrl { get; set; }
    public DateOnly ShowDate { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public string CinemaName { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public string RoomType { get; set; } = string.Empty;
    public decimal PricePerSeat { get; set; }

    /// <summary>Danh sách ghế, đã nhóm theo hàng (SeatRow).</summary>
    public List<SeatRowViewModel> Rows { get; set; } = new();
}

/// <summary>Một hàng ghế (A, B, C, D…).</summary>
public class SeatRowViewModel
{
    public string RowLabel { get; set; } = string.Empty;
    public List<SeatItemViewModel> Seats { get; set; } = new();
}

/// <summary>Một ghế cụ thể trong sơ đồ.</summary>
public class SeatItemViewModel
{
    public int ShowtimeSeatId { get; set; }
    public int SeatId { get; set; }
    public string SeatRow { get; set; } = string.Empty;
    public int SeatNumber { get; set; }
    public string SeatType { get; set; } = string.Empty;   // Normal / VIP / Couple
    public string Status { get; set; } = string.Empty;     // Available / Holding / Booked
    /// <summary>True nếu ghế này đang được chính user hiện tại giữ.</summary>
    public bool IsHeldByCurrentUser { get; set; }
}

/// <summary>Form POST từ trang SelectSeat.</summary>
public class HoldSeatsRequest
{
    public int ShowtimeId { get; set; }

    /// <summary>Danh sách SeatId (không phải ShowtimeSeatId) mà user đã chọn.</summary>
    public List<int> SelectedSeatIds { get; set; } = new();
}

// ---------------------------------------------------------------------------
// CONFIRM BOOKING
// ---------------------------------------------------------------------------

/// <summary>Dữ liệu hiển thị trang xác nhận đặt vé (GET).</summary>
public class BookingConfirmViewModel
{
    public int ShowtimeId { get; set; }
    public string MovieTitle { get; set; } = string.Empty;
    public string? PosterUrl { get; set; }
    public DateOnly ShowDate { get; set; }
    public TimeOnly StartTime { get; set; }
    public string CinemaName { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public string RoomType { get; set; } = string.Empty;
    public decimal PricePerSeat { get; set; }

    public List<HeldSeatInfo> HeldSeats { get; set; } = new();

    public DateTime HoldExpiresAt { get; set; }

    // Promo
    public string? AppliedPromoCode { get; set; }
    public decimal DiscountPercent { get; set; }

    // Totals
    public decimal SubTotal => PricePerSeat * HeldSeats.Count;
    public decimal DiscountAmount => Math.Round(SubTotal * DiscountPercent / 100, 0);
    public decimal TotalAmount => SubTotal - DiscountAmount;
}

/// <summary>Thông tin tóm tắt về một ghế đang được giữ.</summary>
public class HeldSeatInfo
{
    public int ShowtimeSeatId { get; set; }
    public string SeatLabel { get; set; } = string.Empty;   // e.g. "A3"
    public string SeatType { get; set; } = string.Empty;
    public decimal Price { get; set; }
}

/// <summary>Form POST từ trang Confirm.</summary>
public class BookingConfirmRequest
{
    public int ShowtimeId { get; set; }

    [StringLength(30)]
    public string? PromoCode { get; set; }
}

// ---------------------------------------------------------------------------
// PAYMENT
// ---------------------------------------------------------------------------

/// <summary>Dữ liệu hiển thị trang thanh toán (GET).</summary>
public class PaymentViewModel
{
    public int BookingId { get; set; }
    public string MovieTitle { get; set; } = string.Empty;
    public DateOnly ShowDate { get; set; }
    public TimeOnly StartTime { get; set; }
    public string CinemaName { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public List<string> SeatLabels { get; set; } = new();
    public decimal TotalAmount { get; set; }
    public string? PromoCode { get; set; }
    public decimal DiscountPercent { get; set; }

    /// <summary>True nếu booking này đã từng có Payment thất bại trước đó.</summary>
    public bool HasPreviousFailure { get; set; }
}

/// <summary>Form POST từ trang Payment.</summary>
public class PaymentRequest
{
    public int BookingId { get; set; }

    [Required(ErrorMessage = "Vui lòng chọn phương thức thanh toán.")]
    public string Method { get; set; } = string.Empty;  // COD / VNPay / Momo

    /// <summary>Dev-mode: giả lập kết quả payment (success/fail).</summary>
    public bool SimulateFailure { get; set; }
}

// ---------------------------------------------------------------------------
// SUCCESS
// ---------------------------------------------------------------------------

/// <summary>Dữ liệu trang đặt vé thành công.</summary>
public class BookingSuccessViewModel
{
    public int BookingId { get; set; }
    public string MovieTitle { get; set; } = string.Empty;
    public string? PosterUrl { get; set; }
    public DateOnly ShowDate { get; set; }
    public TimeOnly StartTime { get; set; }
    public string CinemaName { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public List<string> SeatLabels { get; set; } = new();
    public decimal TotalAmount { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public DateTime PaidAt { get; set; }
}

// ---------------------------------------------------------------------------
// BOOKING HISTORY
// ---------------------------------------------------------------------------

/// <summary>Một dòng trong trang lịch sử đặt vé.</summary>
public class BookingHistoryViewModel
{
    public int BookingId { get; set; }
    public string MovieTitle { get; set; } = string.Empty;
    public string? PosterUrl { get; set; }
    public DateOnly ShowDate { get; set; }
    public TimeOnly StartTime { get; set; }
    public string CinemaName { get; set; } = string.Empty;
    public int SeatCount { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = string.Empty;     // Pending / Paid / Cancelled
    public DateTime BookingDate { get; set; }
    public string? PaymentStatus { get; set; }
}

// ---------------------------------------------------------------------------
// BOOKING DETAIL
// ---------------------------------------------------------------------------

/// <summary>Chi tiết đầy đủ của một booking.</summary>
public class BookingDetailViewModel
{
    public int BookingId { get; set; }
    public string MovieTitle { get; set; } = string.Empty;
    public string? PosterUrl { get; set; }
    public int Duration { get; set; }
    public DateOnly ShowDate { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public string CinemaName { get; set; } = string.Empty;
    public string CinemaAddress { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public string RoomType { get; set; } = string.Empty;

    public List<BookingDetailSeatInfo> Seats { get; set; } = new();
    public decimal SubTotal { get; set; }
    public string? PromoCode { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal TotalAmount { get; set; }

    public string BookingStatus { get; set; } = string.Empty;
    public DateTime BookingDate { get; set; }

    // Payment info (latest payment attempt)
    public string? PaymentStatus { get; set; }
    public string? PaymentMethod { get; set; }
    public DateTime? PaidAt { get; set; }

    /// <summary>True nếu có thể hủy (Status == Pending).</summary>
    public bool CanCancel => BookingStatus == "Pending";

    /// <summary>True nếu có thể thử thanh toán lại (Status == Pending).</summary>
    public bool CanRetryPayment => BookingStatus == "Pending";
}

/// <summary>Thông tin một ghế trong trang chi tiết booking.</summary>
public class BookingDetailSeatInfo
{
    public string SeatLabel { get; set; } = string.Empty;
    public string SeatType { get; set; } = string.Empty;
    public decimal Price { get; set; }
}

// ---------------------------------------------------------------------------
// SHOWTIME SELECTION (entry point từ Movie/Details)
// ---------------------------------------------------------------------------

/// <summary>Dữ liệu cho trang chọn suất chiếu của một bộ phim.</summary>
public class ShowtimeSelectionViewModel
{
    public int MovieId { get; set; }
    public string MovieTitle { get; set; } = string.Empty;
    public string? PosterUrl { get; set; }
    public int Duration { get; set; }
    public string? AgeRating { get; set; }

    /// <summary>Suất chiếu nhóm theo ngày.</summary>
    public List<ShowtimeDayGroup> DayGroups { get; set; } = new();
}

/// <summary>Một nhóm suất chiếu trong cùng một ngày.</summary>
public class ShowtimeDayGroup
{
    public DateOnly ShowDate { get; set; }
    public List<ShowtimeItemViewModel> Showtimes { get; set; } = new();
}

/// <summary>Một suất chiếu cụ thể.</summary>
public class ShowtimeItemViewModel
{
    public int ShowtimeId { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public string CinemaName { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public string RoomType { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int AvailableSeats { get; set; }
}
