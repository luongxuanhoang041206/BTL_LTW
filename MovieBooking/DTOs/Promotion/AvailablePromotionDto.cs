namespace MovieBooking.DTOs.Promotion
{
    /// <summary>Mã khuyến mãi hiển thị cho khách hàng (không lộ dữ liệu nội bộ).</summary>
    public class AvailablePromotionDto
    {
        public string Code { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string DiscountType { get; set; } = "percent";
        public decimal DiscountValue { get; set; }
        public string PromotionScope { get; set; } = "all";
        public decimal MinOrderAmount { get; set; }
        public decimal? MaxDiscountAmount { get; set; }
        public string StartDate { get; set; } = string.Empty;
        public string EndDate { get; set; } = string.Empty;
        public int? UsageLimit { get; set; }
        public int? RemainingUses { get; set; }
    }
}