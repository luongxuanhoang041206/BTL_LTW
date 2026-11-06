namespace MovieBooking.DTOs;

public sealed class BatchSeatRequestDto
{
    public int Rows { get; set; } = 5;
    public int Cols { get; set; } = 12;
    public List<string> VipRows { get; set; } = new() { "D", "E" };
}

public sealed class UpdateSeatRequestDto
{
    public string? SeatType { get; set; }
    public bool? IsActive { get; set; }
}

public sealed record SeatItemDto(int Id, string Row, int Number, string Type, bool IsActive);
public sealed record RoomSeatMapDto(int RoomId, string RoomName, string RoomType, string CinemaName, List<SeatItemDto> Seats);
public sealed record SeatGenerationResult(string? Error, int SeatCount, string? RoomName);
public sealed record SeatStateDto(int SeatId, bool IsActive);
public sealed record UpdatedSeatDto(int SeatId, string SeatType, bool IsActive);
