using System.Collections.Generic;
using System.Threading.Tasks;
using MovieBooking.DTOs;
using MovieBooking.Models;

namespace MovieBooking.Services.Interfaces;

public interface IMovieService
{
    Task<IEnumerable<Movie>> GetAllMoviesAsync(string? status, string? genre, string? search, int page);

    Task<IEnumerable<Movie>> GetNowShowingMoviesAsync();

    Task<IEnumerable<Movie>> GetComingSoonMoviesAsync();

    Task<IEnumerable<Genre>> GetAllGenresAsync();

    Task<Movie?> GetMovieByIdAsync(int id);

    Task<Movie> CreateMovieAsync(MovieFormDto dto);

    Task<bool> UpdateMovieAsync(int id, MovieFormDto dto);

    Task<bool> DeleteMovieAsync(int id);
}
