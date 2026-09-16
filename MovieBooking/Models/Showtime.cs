using System;
using System.Collections.Generic;

namespace MovieBooking.Models;

public partial class Showtime
{
    public int ShowtimeId { get; set; }

    public int MovieId { get; set; }

    public int RoomId { get; set; }

    public DateOnly ShowDate { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public decimal Price { get; set; }

    public string Status { get; set; } = null!;

    public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();

    public virtual Movie Movie { get; set; } = null!;

    public virtual Room Room { get; set; } = null!;

    public virtual ICollection<ShowtimeSeat> ShowtimeSeats { get; set; } = new List<ShowtimeSeat>();
}
