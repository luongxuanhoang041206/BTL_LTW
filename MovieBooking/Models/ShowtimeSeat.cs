using System;
using System.Collections.Generic;

namespace MovieBooking.Models;

public partial class ShowtimeSeat
{
    public int ShowtimeSeatId { get; set; }

    public int ShowtimeId { get; set; }

    public int SeatId { get; set; }

    public string Status { get; set; } = null!;

    public DateTime? HoldExpiresAt { get; set; }

    public int? LockedByUserId { get; set; }

    public virtual BookingDetail? BookingDetail { get; set; }

    public virtual User? LockedByUser { get; set; }

    public virtual Seat Seat { get; set; } = null!;

    public virtual Showtime Showtime { get; set; } = null!;
}
