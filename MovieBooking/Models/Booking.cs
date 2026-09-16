using System;
using System.Collections.Generic;

namespace MovieBooking.Models;

public partial class Booking
{
    public int BookingId { get; set; }

    public int UserId { get; set; }

    public int ShowtimeId { get; set; }

    public int? PromotionId { get; set; }

    public DateTime BookingDate { get; set; }

    public decimal TotalAmount { get; set; }

    public string Status { get; set; } = null!;

    public virtual ICollection<BookingDetail> BookingDetails { get; set; } = new List<BookingDetail>();

    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();

    public virtual Promotion? Promotion { get; set; }

    public virtual Showtime Showtime { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
