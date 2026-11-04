namespace MovieBooking.DTOs;

public sealed record AdminReviewDto(
    int Id,
    int MovieId,
    string MovieTitle,
    string? PosterUrl,
    string CustomerName,
    string CustomerEmail,
    int Rating,
    string Comment,
    string CreatedAt);
