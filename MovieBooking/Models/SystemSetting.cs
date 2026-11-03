namespace MovieBooking.Models;

public class SystemSetting
{
    public int SettingId { get; set; }

    public string SettingKey { get; set; } = null!;

    public string SettingValue { get; set; } = null!;

    public string? Description { get; set; }

    public DateTime UpdatedAt { get; set; }

    public int? UpdatedByUserId { get; set; }

    public virtual User? UpdatedByUser { get; set; }
}
