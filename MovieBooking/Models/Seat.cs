using System;
using System.Collections.Generic;

namespace MovieBooking.Models;

public partial class Seat
{
    public int SeatId { get; set; }

    public int RoomId { get; set; }

    public string SeatRow { get; set; } = null!;

    public int SeatNumber { get; set; }

    public string SeatType { get; set; } = null!;

    public bool IsActive { get; set; }

    public virtual Room Room { get; set; } = null!;

    public virtual ICollection<ShowtimeSeat> ShowtimeSeats { get; set; } = new List<ShowtimeSeat>();
}
