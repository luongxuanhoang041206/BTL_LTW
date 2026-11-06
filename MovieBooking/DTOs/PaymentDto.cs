namespace MovieBooking.DTOs;
public sealed record AdminPaymentDto(
    int Id,
    int BookingId,
    string BookingCode,
    string CustomerName,
    string CustomerEmail,
    string MovieTitle,
    decimal Amount,
    string Method,
    string TransactionCode,
    string Status,
    string? PaidAt);

public record BankPaymentInfo(
    int PaymentId, decimal Amount, string Content,
    string QrUrl, string BankCode, string AccountNumber, string AccountName);

// ---------------------------------------------------------------------------
// ADMIN PAYMENT — filter / pagination / summary / detail
// ---------------------------------------------------------------------------

/// <summary>Query filter cho Admin payment list.</summary>
public class AdminPaymentQueryDto
{
    public string? Keyword { get; set; }          // transactionCode, bookingCode, customerName/email
    public string? Status { get; set; }           // Pending | Completed | Failed
    public string? Method { get; set; }           // SePay | VNPAY | Cash ...
    public string? FromDate { get; set; }         // yyyy-MM-dd (paidAt)
    public string? ToDate { get; set; }
    public string SortBy { get; set; } = "paidAt";
    public string SortOrder { get; set; } = "desc";
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 15;
}

/// <summary>Summary stats cho trang Admin payments.</summary>
public class AdminPaymentSummaryDto
{
    public int Total { get; set; }
    public int Completed { get; set; }
    public int Pending { get; set; }
    public int Failed { get; set; }
    public decimal TotalRevenue { get; set; }     // chỉ tính Completed
}

/// <summary>Chi tiết một giao dịch cho Admin.</summary>
public class AdminPaymentDetailDto
{
    public int PaymentId { get; set; }
    public string Method { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? TransactionCode { get; set; }
    public string? PaidAt { get; set; }
    public string CreatedAt { get; set; } = string.Empty;

    // Booking liên quan
    public int BookingId { get; set; }
    public string BookingCode { get; set; } = string.Empty;
    public string BookingStatus { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string MovieTitle { get; set; } = string.Empty;
    public string ShowDate { get; set; } = string.Empty;
    public string StartTime { get; set; } = string.Empty;
    public string CinemaName { get; set; } = string.Empty;
    public List<string> Seats { get; set; } = new();
}
