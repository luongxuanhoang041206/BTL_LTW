namespace MovieBooking.DTOs.Showtime
{
    public class RoomCalendarDto
    {
        public int RoomId { get; set; }
        public string RoomName { get; set; } = string.Empty;
        public string RoomType { get; set; } = string.Empty;
        public int TotalSeats { get; set; }

        public List<ShowtimeCalendarItemDto> Showtimes { get; set; } = new();
    }
}
