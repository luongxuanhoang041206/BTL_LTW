namespace MovieBooking.DTOs;

public sealed record AdminWebsiteContentDto(
    string Draft,
    string Published,
    DateTime? UpdatedAt,
    DateTime? PublishedAt);
