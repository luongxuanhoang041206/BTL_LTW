using System.Collections.Generic;
using System.Threading.Tasks;
using MovieBooking.DTOs;
using MovieBooking.Models;

namespace MovieBooking.Services.Interfaces;

public interface IMovieService
{
    Task<IEnumerable<MovieResponseDto>> GetMovieResponsesAsync(string? status, string? genre, string? search, int page);
    Task<IEnumerable<MovieResponseDto>> GetNowShowingMovieResponsesAsync();
    Task<IEnumerable<MovieResponseDto>> GetComingSoonMovieResponsesAsync();
    Task<MovieResponseDto?> GetMovieResponseByIdAsync(int id);
    Task<IEnumerable<AdminMovieDto>> GetAdminMovieResponsesAsync(string? search, int page);
    Task<AdminMovieDto?> GetAdminMovieResponseByIdAsync(int id);
    Task<IEnumerable<Movie>> GetAllMoviesAsync(string? status, string? genre, string? search, int page);

    Task<IEnumerable<Movie>> GetNowShowingMoviesAsync();

    Task<IEnumerable<Movie>> GetComingSoonMoviesAsync();
    Task<IEnumerable<Movie>> GetAdminMoviesAsync(string? search, int page);
    Task<bool> MovieExistsAsync(int id);
    Task<bool> HasShowtimesOrReviewsAsync(int id);
    Task<List<DateOnly>?> GetUpcomingShowtimeDatesAsync(int movieId);



    Task<Movie?> GetMovieByIdAsync(int id, bool includeExpired = false);

    Task<bool> MovieTitleExistsAsync(string title, int? exceptMovieId = null);

    Task<Movie> CreateMovieAsync(MovieFormDto dto);

    Task<bool> UpdateMovieAsync(int id, MovieFormDto dto);

    Task<bool> DeleteMovieAsync(int id);

}
