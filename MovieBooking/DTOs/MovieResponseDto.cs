namespace MovieBooking.DTOs;

public sealed record MovieGenreDto(int Id, string Name);
public sealed record MovieResponseDto(int Id, string Title, string? Description, int Duration,
    string? ReleaseDate, string? EndDate, string? PosterUrl, string? TrailerUrl, string? Director,
    string? Actors, string? Language, string? AgeRating, string Status, List<MovieGenreDto> Genres);
public sealed record AdminMovieDto(int Id, string Title, string? Description, int Duration,
    string? ReleaseDate, string? EndDate, string? PosterUrl, string? TrailerUrl, string? Director,
    string? Actors, string? Language, string? AgeRating, string Status, bool IsExpired, List<MovieGenreDto> Genres);
public sealed record GenreResponseDto(int Id, string Name, int MovieCount);
