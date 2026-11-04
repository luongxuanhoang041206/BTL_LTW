namespace MovieBooking.DTOs.Cinema
{
    public class CinemaDetailDto
    {
        public int Id { get; set; }

        public string Name { get; set; } = "";

        public string Address { get; set; } = "";

        public string City { get; set; } = "";

        public string Phone { get; set; } = "";

        public List<CinemaRoomDto> Rooms { get; set; } = new();
    }
}
