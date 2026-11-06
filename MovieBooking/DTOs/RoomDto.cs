namespace MovieBooking.DTOs;

public sealed class RoomFormDto
{
    public int CinemaId { get; set; }
    public string RoomName { get; set; } = string.Empty;
    public string RoomType { get; set; } = "2D";
    public int TotalSeats { get; set; } = 60;
    public bool AutoGenerateSeats { get; set; } = true;
}

public sealed record AdminRoomDto(int Id, int CinemaId, string CinemaName, string RoomName,
    string RoomType, int TotalSeats, int ActiveSeats, int ShowtimesCount);
