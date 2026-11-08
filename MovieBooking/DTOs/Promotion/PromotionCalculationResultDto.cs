namespace MovieBooking.DTOs.Promotion
{
    public class PromotionCalculationResultDto
    {
        public bool Valid { get; set; }

        public string? Error { get; set; }

        public int? PromotionId { get; set; }

        public string? Code { get; set; }

        public string? DiscountType { get; set; }

        public decimal DiscountValue { get; set; }

        public string? PromotionScope { get; set; }

        // Tổng tiền trước khi giảm
        public decimal OrderAmount { get; set; }

        // Số tiền thuộc phạm vi được giảm
        public decimal EligibleAmount { get; set; }

        // Số tiền thực tế được giảm
        public decimal DiscountAmount { get; set; }

        // Tổng tiền sau khi giảm
        public decimal TotalAmount { get; set; }
    }
}
