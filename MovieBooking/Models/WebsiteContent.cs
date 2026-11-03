namespace MovieBooking.Models;

public class WebsiteContent
{
    public int ContentId { get; set; }
    public string ContentKey { get; set; } = null!;
    public string DraftJson { get; set; } = "{}";
    public string? PublishedJson { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int? UpdatedByUserId { get; set; }
    public DateTime? PublishedAt { get; set; }
}
