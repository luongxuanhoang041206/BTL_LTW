namespace MovieBooking.DTOs;

/// <summary>Create / update form cho Admin promotion.</summary>
public sealed class PromotionFormDto
{
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string DiscountType { get; set; } = "percent";   // percent | fixed
    public decimal DiscountValue { get; set; }
    public string PromotionScope { get; set; } = "all";      // all | tickets | foods | combos
    public decimal MinOrderAmount { get; set; }
    public decimal? MaxDiscountAmount { get; set; }
    public int? UsageLimit { get; set; }
    public int? UsageLimitPerUser { get; set; }
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public bool Status { get; set; } = true;
}

/// <summary>Một dòng trong danh sách Admin promotions.</summary>
public sealed class AdminPromotionDto
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string DiscountType { get; set; } = "percent";
    public decimal DiscountValue { get; set; }
    public decimal DiscountPercent { get; set; }   // legacy display
    public string PromotionScope { get; set; } = "all";
    public decimal MinOrderAmount { get; set; }
    public decimal? MaxDiscountAmount { get; set; }
    public int? UsageLimit { get; set; }
    public int? UsageLimitPerUser { get; set; }
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public bool Status { get; set; }
    public int UsedCount { get; set; }      // số lượt đã redeemed (PromotionUsages)
    public int HeldCount { get; set; }      // số lượt đang giữ (Reserved, chưa hết hạn)
    public int? RemainingUses { get; set; } // null = không giới hạn
}

// ---------------------------------------------------------------------------
// ADMIN PROMOTION — filter / pagination / summary
// ---------------------------------------------------------------------------

/// <summary>Query filter cho Admin promotion list.</summary>
public class AdminPromotionQueryDto
{
    public string? Keyword { get; set; }            // code hoặc description
    public bool? Status { get; set; }               // true=active, false=inactive, null=all
    public string? DiscountType { get; set; }       // percent | fixed
    public string? PromotionScope { get; set; }     // all | tickets | foods | combos
    public string? FromDate { get; set; }           // lọc EndDate >= FromDate
    public string? ToDate { get; set; }             // lọc StartDate <= ToDate
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
    public int TotalRedeemed { get; set; } // tổng lượt đã sử dụng thành công
    public decimal TotalDiscountAmount { get; set; } // tổng tiền đã giảm
}