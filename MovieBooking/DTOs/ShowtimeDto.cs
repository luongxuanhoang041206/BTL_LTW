namespace MovieBooking.DTOs;

public sealed record AdminShowtimeResponseDto(int ShowtimeId, int MovieId, string MovieTitle,
    int CinemaId, string CinemaName, int RoomId, string RoomName, string ShowDate,
    string StartTime, string EndTime, decimal Price, string Status);

public sealed class ShowtimeListDto
{
    public int ShowtimeId { get; set; }
    public int MovieId { get; set; }
    public string MovieTitle { get; set; } = string.Empty;
    public string? PosterUrl { get; set; }
    public int CinemaId { get; set; }
    public string CinemaName { get; set; } = string.Empty;
    public int RoomId { get; set; }
    public string RoomName { get; set; } = string.Empty;
    public string ShowDateTime { get; set; } = string.Empty;
    public string ShowDate { get; set; } = string.Empty;
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int TotalBookings { get; set; }
    public int TotalSeats { get; set; }
    public decimal Earnings { get; set; }
    public string Status { get; set; } = string.Empty;
}
