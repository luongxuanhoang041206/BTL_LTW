using System;
using System.Collections.Generic;

namespace MovieBooking.Models;

public partial class Ticket
{
    public int TicketId { get; set; }

    public int BookingDetailId { get; set; }

    public string TicketCode { get; set; } = null!;

    public string Qrtoken { get; set; } = null!;

    public string Status { get; set; } = null!;

    public DateTime IssuedAt { get; set; }

    public DateTime? CheckedInAt { get; set; }

    public int? CheckedInByUserId { get; set; }

    public virtual ICollection<TicketCheckInLog> TicketCheckInLogs { get; set; } = new List<TicketCheckInLog>();
}
