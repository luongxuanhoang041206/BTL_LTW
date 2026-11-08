
using System;
using System.Collections.Generic;

namespace MovieBooking.Models;

public partial class Promotion
{
    public int PromotionId { get; set; }

    public string Code { get; set; } = null!;

    public string? Description { get; set; }

    public decimal DiscountPercent { get; set; }

    public string DiscountType { get; set; } = "percent";

    public decimal DiscountValue { get; set; }

    public string PromotionScope { get; set; } = "all";

    public decimal MinOrderAmount { get; set; }
    public decimal? MaxDiscountAmount { get; set; }

    public int? UsageLimit { get; set; }

    public int? UsageLimitPerUser { get; set; }

    public DateOnly StartDate { get; set; }

    public DateOnly EndDate { get; set; }

    public bool Status { get; set; }

    public virtual ICollection<Booking> Bookings { get; set; }
        = new List<Booking>();
}
