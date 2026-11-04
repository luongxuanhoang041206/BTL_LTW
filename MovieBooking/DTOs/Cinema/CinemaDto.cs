namespace MovieBooking.DTOs.Cinema;

public class CinemaDto
{
    public int CinemaId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Phone { get; set; }
    public int TotalRooms { get; set; }
}

public class CinemaRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Phone { get; set; }
}

public class AdminCinemaDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Status { get; set; }
    public int RoomCount { get; set; }
    public int ActiveShowsCount { get; set; }
}
