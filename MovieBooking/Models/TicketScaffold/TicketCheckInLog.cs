using System;
using System.Collections.Generic;

namespace MovieBooking.Models;

public partial class TicketCheckInLog
{
    public long LogId { get; set; }

    public int TicketId { get; set; }

    public int? StaffId { get; set; }

    public string Action { get; set; } = null!;

    public string? Message { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Ticket Ticket { get; set; } = null!;
}
