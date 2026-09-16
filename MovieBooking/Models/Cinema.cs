using System;
using System.Collections.Generic;

namespace MovieBooking.Models;

public partial class Cinema
{
    public int CinemaId { get; set; }

    public string Name { get; set; } = null!;

    public string? Address { get; set; }

    public string? City { get; set; }

    public string? Phone { get; set; }

    public virtual ICollection<Room> Rooms { get; set; } = new List<Room>();
}
