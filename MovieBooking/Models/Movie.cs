using System;
using System.Collections.Generic;

namespace MovieBooking.Models;

public partial class Movie
{
    public int MovieId { get; set; }

    public string Title { get; set; } = null!;

    public string? Description { get; set; }

    public int Duration { get; set; }

    public DateOnly? ReleaseDate { get; set; }

    public DateOnly? EndDate { get; set; }

    public string? PosterUrl { get; set; }

    public string? TrailerUrl { get; set; }

    public string? Director { get; set; }

    public string? Actors { get; set; }

    public string? Language { get; set; }

    public string? AgeRating { get; set; }

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public virtual ICollection<Review> Reviews { get; set; } = new List<Review>();

    public virtual ICollection<Showtime> Showtimes { get; set; } = new List<Showtime>();

    public virtual ICollection<Genre> Genres { get; set; } = new List<Genre>();
}
