using System;
using System.Collections.Generic;

namespace MovieBooking.Models;

public partial class Payment
{
    public int PaymentId { get; set; }

    public int BookingId { get; set; }

    public decimal Amount { get; set; }

    public string Method { get; set; } = null!;

    public string? TransactionCode { get; set; }

    public string PaymentStatus { get; set; } = null!;

    public DateTime? PaidAt { get; set; }

    public virtual Booking Booking { get; set; } = null!;
}
