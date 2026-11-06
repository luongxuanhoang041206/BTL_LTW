namespace MovieBooking.DTOs;

public sealed class PromotionFormDto
{
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal DiscountPercent { get; set; }
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public bool Status { get; set; } = true;
}

public sealed record AdminPromotionDto(
    int Id,
    string Code,
    string Description,
    decimal DiscountPercent,
    string StartDate,
    string EndDate,
    bool Status,
    int UsedCount);

// ---------------------------------------------------------------------------
// ADMIN PROMOTION — filter / pagination / summary
// ---------------------------------------------------------------------------

/// <summary>Query filter cho Admin promotion list.</summary>
public class AdminPromotionQueryDto
{
    public string? Keyword { get; set; }       // code hoặc description
    public bool? Status { get; set; }          // true=active, false=inactive, null=all
    public string? FromDate { get; set; }      // lọc EndDate >= FromDate
    public string? ToDate { get; set; }        // lọc StartDate <= ToDate
    public string SortBy { get; set; } = "promotionId";
    public string SortOrder { get; set; } = "desc";
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 12;
}

/// <summary>Summary stats cho trang Admin promotions.</summary>
public class AdminPromotionSummaryDto
{
    public int Total { get; set; }
    public int Active { get; set; }        // Status=true và trong thời hạn
    public int Upcoming { get; set; }      // Status=true và StartDate > today
    public int Expired { get; set; }       // EndDate < today
    public int Inactive { get; set; }      // Status=false
}
