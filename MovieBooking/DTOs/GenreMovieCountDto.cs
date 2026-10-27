using System.Runtime.CompilerServices;

namespace MovieBooking.DTOs
{
    public class GenreMovieCountDto
    {
        public int GenreId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string GenreName => Name;
        public int MovieCount { get; set; }
    }
}
