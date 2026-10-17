namespace MovieBooking.DTOs;

public class CinemaDto
{
    public int CinemaId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Phone { get; set; }
    public int TotalRooms { get; set; }
}
