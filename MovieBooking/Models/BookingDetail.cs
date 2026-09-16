using System;
using System.Collections.Generic;

namespace MovieBooking.Models;

public partial class BookingDetail
{
    public int BookingDetailId { get; set; }

    public int BookingId { get; set; }

    public int ShowtimeSeatId { get; set; }

    public decimal Price { get; set; }

    public virtual Booking Booking { get; set; } = null!;

    public virtual ShowtimeSeat ShowtimeSeat { get; set; } = null!;
}
