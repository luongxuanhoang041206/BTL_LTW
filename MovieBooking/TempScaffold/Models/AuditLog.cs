using System;
using System.Collections.Generic;

namespace MovieBooking.TempScaffold.Models;

public partial class AuditLog
{
    public long LogId { get; set; }

    public int? UserId { get; set; }

    public string Action { get; set; } = null!;

    public string Target { get; set; } = null!;

    public string? Details { get; set; }

    public string Status { get; set; } = null!;

    public string? IpAddress { get; set; }

    public DateTime CreatedAt { get; set; }
}
