
namespace MovieBooking.Models;

public partial class PromotionUsage
{
    public int PromotionUsageId { get; set; }

    public int PromotionId { get; set; }

    public int UserId { get; set; }

    public int BookingId { get; set; }

    public string PromotionCode { get; set; } = null!;

    public string DiscountType { get; set; } = null!;

    public decimal DiscountValue { get; set; }

    public string PromotionScope { get; set; } = null!;

    public decimal EligibleAmount { get; set; }

    public decimal DiscountAmount { get; set; }

    public DateTime RedeemedAt { get; set; }

    // Navigation properties
    public virtual Promotion Promotion { get; set; } = null!;

    public virtual User User { get; set; } = null!;

    public virtual Booking Booking { get; set; } = null!;
}

// lich su su dung sau khi thanh toan xong
