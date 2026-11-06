namespace MovieBooking.DTOs.Showtime
{
    public class CinemaCalendarDto
    {
        public int CinemaId { get; set; }
        public string CinemaName { get; set; } = string.Empty;

        public List<RoomCalendarDto> Rooms { get; set; } = new();
    }
}
