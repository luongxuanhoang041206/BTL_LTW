namespace MovieBooking.DTOs.Promotion
{
    /// <summary>
    /// Yêu cầu xem trước giảm giá từ trang checkout. Số tiền do client gửi chỉ
    /// phục vụ preview; khi đặt vé thật backend tự tính lại từ ghế/món đã lưu.
    /// </summary>
    public class PromotionPreviewRequestDto
    {
        public string Code { get; set; } = string.Empty;
        public decimal TicketsAmount { get; set; }
        public decimal FoodsAmount { get; set; }
        public decimal CombosAmount { get; set; }
    }
}