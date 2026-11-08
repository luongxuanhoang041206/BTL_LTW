using System;
using System.Collections.Generic;

namespace MovieBooking.DTOs;

// ---------------------------------------------------------------------------
// TICKET (vé điện tử theo từng ghế)
// ---------------------------------------------------------------------------

/// <summary>Một vé điện tử của một ghế.</summary>
public class TicketDto
{
    public int TicketId { get; set; }
    public int BookingDetailId { get; set; }
    public string TicketCode { get; set; } = string.Empty;

    /// <summary>Endpoint trả ảnh PNG của QR được sinh từ QRToken (không trả QRToken thô).</summary>
    public string? QrImageUrl { get; set; }

    /// <summary>Issued / Used / Cancelled / NotIssued</summary>
    public string Status { get; set; } = string.Empty;
    public string StatusLabel { get; set; } = string.Empty;

    public DateTime? IssuedAt { get; set; }
    public DateTime? CheckedInAt { get; set; }

    // Thông tin ghế
    public string SeatLabel { get; set; } = string.Empty;
    public string SeatType { get; set; } = string.Empty;
    public decimal Price { get; set; }
}

/// <summary>Danh sách vé của một booking, kèm thông tin phim/suất chiếu/rạp/phòng.</summary>
public class BookingTicketsViewModel
{
    public int BookingId { get; set; }
    public string BookingCode { get; set; } = string.Empty;
    public string BookingStatus { get; set; } = string.Empty;
    public string? PaymentStatus { get; set; }

    public string MovieTitle { get; set; } = string.Empty;
    public string? PosterUrl { get; set; }
    public string CinemaName { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public DateOnly ShowDate { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }

    public List<TicketDto> Tickets { get; set; } = new();
}

// ---------------------------------------------------------------------------
// CHECK-IN
// ---------------------------------------------------------------------------

/// <summary>Yêu cầu check-in: QRToken giải mã được từ mã QR.</summary>
public class TicketCheckInRequestDto
{
    public string QrToken { get; set; } = string.Empty;
}

/// <summary>Kết quả check-in trả về cho nhân viên soát vé.</summary>
public class TicketCheckInResultDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;

    public string? TicketCode { get; set; }
    public string? Status { get; set; }

    public string? MovieTitle { get; set; }
    public string? CinemaName { get; set; }
    public string? RoomName { get; set; }
    public string? ShowDate { get; set; }
    public string? StartTime { get; set; }
    public string? SeatLabel { get; set; }

    public DateTime? CheckedInAt { get; set; }
}
