namespace MovieBooking.DTOs.Cinema
{
    public class CinemaQueryDto
    {
        public string? City { get; set; }

        public string? Keyword { get; set; }

        public string? Status { get; set; }

        public int Page { get; set; } = 1;

        public int PageSize { get; set; } = 10;
    }
}
