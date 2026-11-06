namespace MovieBooking.DTOs.Showtime
{
    public class ShowtimeCalendarResponseDto
    {
        public DateOnly StartDate { get; set; }
        public DateOnly EndDate { get; set; }

        public List<CinemaCalendarDto> Data { get; set; } = new();
    }
}
