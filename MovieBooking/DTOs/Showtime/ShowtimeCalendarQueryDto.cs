namespace MovieBooking.DTOs.Showtime
{
    public class ShowtimeCalendarQueryDto
    {
        public DateOnly? StartDate { get; set; }
        public DateOnly? EndDate { get; set; }

        public int? CinemaId { get; set; }
        public int? RoomId { get; set; }
        public int? MovieId { get; set; }

        public string? Status { get; set; }
    }
}
