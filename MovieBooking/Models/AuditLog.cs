namespace MovieBooking.Models;

public class AuditLog
{
    public long LogId { get; set; }

    public int? UserId { get; set; }

    public string Action { get; set; } = null!;

    public string Target { get; set; } = null!;

    public string? Details { get; set; }

    public string Status { get; set; } = "Success";

    public string? IpAddress { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User? User { get; set; }
}
