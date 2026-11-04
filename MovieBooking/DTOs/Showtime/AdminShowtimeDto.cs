using Microsoft.Identity.Client;

namespace MovieBooking.DTOs.Showtime
{
    public class AdminShowtimeDto
    {
        public int ShowtimeId { get; set; }

        public int MovieId { get; set; }

        public string MovieName { get; set; } = string.Empty;

        public int CinemaId { get; set; }

        public string CinemaName { get; set; } = string.Empty;

        public int RoomId { get; set; }

        public string RoomName { get; set; } = string.Empty;

        public DateOnly ShowDate { get; set; }

        public TimeOnly StartTime { get; set; }

        public TimeOnly EndTime { get; set; }

        public decimal Price { get; set; }

        public string Status { get; set; } = string.Empty;

        public decimal VipMultiplier { get; set; }
    }
}
