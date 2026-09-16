using System;
using System.Collections.Generic;

namespace MovieBooking.Models;

public partial class Room
{
    public int RoomId { get; set; }

    public int CinemaId { get; set; }

    public string RoomName { get; set; } = null!;

    public string RoomType { get; set; } = null!;

    public int TotalSeats { get; set; }

    public virtual Cinema Cinema { get; set; } = null!;

    public virtual ICollection<Seat> Seats { get; set; } = new List<Seat>();

    public virtual ICollection<Showtime> Showtimes { get; set; } = new List<Showtime>();
}
