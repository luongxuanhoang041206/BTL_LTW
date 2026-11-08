namespace MovieBooking.DTOs.Promotion
{
    /// <summary>Một dòng lịch sử giữ / sử dụng mã của một booking.</summary>
    public class PromotionUsageDto
    {
        public int RedemptionId { get; set; }
        public int BookingId { get; set; }
        public string BookingCode { get; set; } = string.Empty;
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string UserEmail { get; set; } = string.Empty;
        public string PromotionCode { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;   // Reserved | Redeemed | Released
        public string DiscountType { get; set; } = "percent";
        public decimal DiscountValue { get; set; }
        public string PromotionScope { get; set; } = "all";
        public decimal EligibleAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public DateTime ReservedAt { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public DateTime? RedeemedAt { get; set; }
        public DateTime? ReleasedAt { get; set; }
    }
}