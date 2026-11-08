
namespace MovieBooking.Models;

public partial class PromotionRedemption
{
    public int RedemptionId { get; set; }

    public int PromotionId { get; set; }

    public int UserId { get; set; }

    public int BookingId { get; set; }

    public string PromotionCode { get; set; } = null!;

    public string Status { get; set; } = null!;

    public DateTime ReservedAt { get; set; }

    public DateTime ExpiresAt { get; set; }

    public DateTime? RedeemedAt { get; set; }

    public DateTime? ReleasedAt { get; set; } // thoi diem giai phong ma khi thanh toan that bat or het han

    // Navigation properties
    public virtual Promotion Promotion { get; set; } = null!;

    public virtual User User { get; set; } = null!;

    public virtual Booking Booking { get; set; } = null!;
}

// ban ghi du ma trong thoi gian thanh toan