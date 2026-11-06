namespace MovieBooking.DTOs.Showtime
{
    public class ShowtimeQueryDto
    {
        public int? CinemaId { get; set; }
        public int? RoomId { get; set; }
        public int? MovieId { get; set; }
        public DateOnly? ShowDate { get; set; }
        public string? Status { get; set; }
        public string? Keyword { get; set; }
        public string SortBy { get; set; } = "startTime";
        public string SortOrder { get; set; } = "asc";

        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }
}
