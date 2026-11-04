namespace MovieBooking.DTOs.Showtime
{
    public class ShowtimeCalendarItemDto
    {
        public int ShowtimeId { get; set; }
        public int MovieId { get; set; }
        public string MovieName { get; set; } = string.Empty;
        public string? PosterUrl { get; set; }

        public DateOnly ShowDate { get; set; }
        public TimeOnly StartTime { get; set; }
        public TimeOnly EndTime { get; set; }

        public decimal Price { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}
