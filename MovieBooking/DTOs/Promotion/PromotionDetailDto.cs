namespace MovieBooking.DTOs.Promotion
{
    /// <summary>Chi tiết một mã khuyến mãi kèm thống kê + lịch sử cho Admin.</summary>
    public class PromotionDetailDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string DiscountType { get; set; } = "percent";
        public decimal DiscountValue { get; set; }
        public string PromotionScope { get; set; } = "all";
        public decimal MinOrderAmount { get; set; }
        public decimal? MaxDiscountAmount { get; set; }
        public int? UsageLimit { get; set; }
        public int? UsageLimitPerUser { get; set; }
        public string StartDate { get; set; } = string.Empty;
        public string EndDate { get; set; } = string.Empty;
        public bool Status { get; set; }

        public int TotalUsed { get; set; }          // đã redeemed
        public int Held { get; set; }               // đang giữ (Reserved, chưa hết hạn)
        public int? RemainingUses { get; set; }     // null = không giới hạn
        public decimal TotalDiscountAmount { get; set; }

        public List<PromotionUsageDto> History { get; set; } = new();
    }
}