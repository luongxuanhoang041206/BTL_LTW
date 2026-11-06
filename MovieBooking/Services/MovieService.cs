using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.DTOs;
using MovieBooking.Models;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Services;

public class MovieService : IMovieService
{
    private readonly MovieBookingContext _context;
    private static DateOnly VietnamToday => DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));

    public MovieService(MovieBookingContext context)
    {
        _context = context;
    }

    private static MovieResponseDto ToMovieResponse(Movie movie) => new(
        movie.MovieId, movie.Title, movie.Description, movie.Duration,
        movie.ReleaseDate?.ToString("yyyy-MM-dd"), movie.EndDate?.ToString("yyyy-MM-dd"),
        movie.PosterUrl, movie.TrailerUrl, movie.Director, movie.Actors, movie.Language,
        movie.AgeRating, movie.Status,
        movie.Genres?.Select(genre => new MovieGenreDto(genre.GenreId, genre.GenreName)).ToList() ?? new());

    private static AdminMovieDto ToAdminMovieResponse(Movie movie) => new(
        movie.MovieId, movie.Title, movie.Description, movie.Duration,
        movie.ReleaseDate?.ToString("yyyy-MM-dd"), movie.EndDate?.ToString("yyyy-MM-dd"),
        movie.PosterUrl, movie.TrailerUrl, movie.Director, movie.Actors, movie.Language,
        movie.AgeRating, movie.Status, movie.EndDate.HasValue && movie.EndDate.Value < VietnamToday,
        movie.Genres?.Select(genre => new MovieGenreDto(genre.GenreId, genre.GenreName)).ToList() ?? new());

    public async Task<IEnumerable<MovieResponseDto>> GetMovieResponsesAsync(string? status, string? genre, string? search, int page)
        => (await GetAllMoviesAsync(status, genre, search, page)).Select(ToMovieResponse).ToList();

    public async Task<IEnumerable<MovieResponseDto>> GetNowShowingMovieResponsesAsync()
        => (await GetNowShowingMoviesAsync()).Select(ToMovieResponse).ToList();

    public async Task<IEnumerable<MovieResponseDto>> GetComingSoonMovieResponsesAsync()
        => (await GetComingSoonMoviesAsync()).Select(ToMovieResponse).ToList();

    public async Task<MovieResponseDto?> GetMovieResponseByIdAsync(int id)
    {
        var movie = await GetMovieByIdAsync(id);
        return movie == null ? null : ToMovieResponse(movie);
    }

    public async Task<IEnumerable<AdminMovieDto>> GetAdminMovieResponsesAsync(string? search, int page)
        => (await GetAdminMoviesAsync(search, page)).Select(ToAdminMovieResponse).ToList();

    public async Task<AdminMovieDto?> GetAdminMovieResponseByIdAsync(int id)
    {
        var movie = await GetMovieByIdAsync(id, includeExpired: true);
        return movie == null ? null : ToAdminMovieResponse(movie);
    }

    private static string NormalizeStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return "Coming Soon";
        }

        var value = status.Trim();
        if (value.Equals("Showing", StringComparison.OrdinalIgnoreCase) ||
            value.Equals("NowShowing", StringComparison.OrdinalIgnoreCase))
        {
            return "Showing";
        }

        if (value.Equals("Coming Soon", StringComparison.OrdinalIgnoreCase) ||
            value.Equals("ComingSoon", StringComparison.OrdinalIgnoreCase))
        {
            return "Coming Soon";
        }

        return value;
    }

    public async Task<IEnumerable<Movie>> GetAllMoviesAsync(
        string? status,
        string? genre,
        string? search,
        int page = 1
    )
    {
        var query = _context.Movies
            .Include(m => m.Genres)
            .AsNoTracking()
            .Where(m => !m.EndDate.HasValue || m.EndDate.Value >= VietnamToday)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = NormalizeStatus(status);
            if (normalizedStatus == "Showing")
            {
                query = query.Where(m => m.Status == "Showing" || m.Status == "NowShowing");
            }
            else if (normalizedStatus == "Coming Soon")
            {
                query = query.Where(m => m.Status == "Coming Soon" || m.Status == "ComingSoon");
            }
            else
            {
                query = query.Where(m => m.Status == normalizedStatus);
            }
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim();
            query = query.Where(m => m.Title.Contains(keyword));
        }

        if (!string.IsNullOrWhiteSpace(genre))
        {
            var genreName = genre.Trim();
            query = query.Where(m => m.Genres.Any(g => g.GenreName == genreName));
        }

        return await query
            .OrderByDescending(m => m.CreatedAt)
            .Skip((page - 1) * 10)
            .Take(10)
            .ToListAsync();
    }

    public async Task<IEnumerable<Movie>> GetAdminMoviesAsync(string? search, int page)
    {
        var query = _context.Movies
            .Include(m => m.Genres)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim().ToLower();
            query = query.Where(m => m.Title.ToLower().Contains(keyword) ||
                                     (m.Director != null && m.Director.ToLower().Contains(keyword)) ||
                                     (m.Actors != null && m.Actors.ToLower().Contains(keyword)));
        }

        return await query
            .OrderByDescending(m => m.CreatedAt)
            .Skip((Math.Max(1, page) - 1) * 10)
            .Take(10)
            .ToListAsync();
    }

    public Task<bool> MovieExistsAsync(int id)
    {
        return _context.Movies.AnyAsync(m => m.MovieId == id);
    }

    public async Task<bool> HasShowtimesOrReviewsAsync(int id)
    {
        return await _context.Showtimes.AnyAsync(s => s.MovieId == id) ||
               await _context.Reviews.AnyAsync(r => r.MovieId == id);
    }

    public async Task<List<DateOnly>?> GetUpcomingShowtimeDatesAsync(int movieId)
    {
        if (!await MovieExistsAsync(movieId)) return null;

        var now = DateTime.Now;
        var today = DateOnly.FromDateTime(now);
        var currentTime = TimeOnly.FromDateTime(now);

        return await _context.Showtimes
            .AsNoTracking()
            .Where(s => s.MovieId == movieId && s.Status == "Active"
                && (s.ShowDate > today || (s.ShowDate == today && s.EndTime > currentTime)))
            .Select(s => s.ShowDate)
            .Distinct()
            .OrderBy(d => d)
            .ToListAsync();
    }

    public async Task<IEnumerable<Movie>> GetNowShowingMoviesAsync()
    {
        return await _context.Movies
            .Include(m => m.Genres)
            .Where(m => (m.Status == "Showing" || m.Status == "NowShowing") &&
                        (!m.EndDate.HasValue || m.EndDate.Value >= VietnamToday))
            .AsNoTracking()
            .OrderByDescending(m => m.ReleaseDate)
            .ToListAsync();
    }

    public async Task<IEnumerable<Movie>> GetComingSoonMoviesAsync()
    {
        return await _context.Movies
            .Include(m => m.Genres)
            .Where(m => (m.Status == "Coming Soon" || m.Status == "ComingSoon") &&
                        (!m.EndDate.HasValue || m.EndDate.Value >= VietnamToday))
            .AsNoTracking()
            .OrderByDescending(m => m.ReleaseDate)
            .ToListAsync();
    }



    public async Task<Movie?> GetMovieByIdAsync(int id, bool includeExpired = false)
    {
        return await _context.Movies
            .Include(m => m.Genres)
            .Include(m => m.Reviews)
            .FirstOrDefaultAsync(m => m.MovieId == id &&
                (includeExpired || !m.EndDate.HasValue || m.EndDate.Value >= VietnamToday));
    }

    public Task<bool> MovieTitleExistsAsync(string title, int? exceptMovieId = null)
    {
        var normalizedTitle = title.Trim().ToLower();
        return _context.Movies.AnyAsync(m =>
            m.Title.Trim().ToLower() == normalizedTitle &&
            (!exceptMovieId.HasValue || m.MovieId != exceptMovieId.Value));
    }

    public async Task<Movie> CreateMovieAsync(MovieFormDto dto)
    {
        ArgumentNullException.ThrowIfNull(dto);

        var movie = new Movie
        {
            Title = dto.Title.Trim(),
            Description = dto.Description,
            Duration = dto.Duration,
            ReleaseDate = dto.ReleaseDate,
            EndDate = dto.EndDate,
            PosterUrl = dto.PosterUrl,
            TrailerUrl = dto.TrailerUrl,
            Director = dto.Director,
            Actors = dto.Actors,
            Language = dto.Language,
            AgeRating = dto.AgeRating,
            Status = NormalizeStatus(dto.Status),
            CreatedAt = DateTime.Now
        };

        if (dto.GenreIds != null && dto.GenreIds.Any())
        {
            var genres = await _context.Genres
                .Where(g => dto.GenreIds.Contains(g.GenreId))
                .ToListAsync();

            movie.Genres = genres;
        }

        _context.Movies.Add(movie);
        await _context.SaveChangesAsync();
        return movie;
    }

    public async Task<bool> UpdateMovieAsync(int id, MovieFormDto dto)
    {
        ArgumentNullException.ThrowIfNull(dto);

        var movie = await _context.Movies
            .Include(m => m.Genres)
            .FirstOrDefaultAsync(m => m.MovieId == id);

        if (movie == null)
        {
            return false;
        }

        movie.Title = dto.Title.Trim();
        movie.Description = dto.Description;
        movie.Duration = dto.Duration;
        movie.ReleaseDate = dto.ReleaseDate;
        movie.EndDate = dto.EndDate;
        movie.PosterUrl = dto.PosterUrl;
        movie.TrailerUrl = dto.TrailerUrl;
        movie.Director = dto.Director;
        movie.Actors = dto.Actors;
        movie.Language = dto.Language;
        movie.AgeRating = dto.AgeRating;
        movie.Status = NormalizeStatus(dto.Status);

        var selectedGenres = dto.GenreIds != null
            ? await _context.Genres.Where(g => dto.GenreIds.Contains(g.GenreId)).ToListAsync()
            : new List<Genre>();

        movie.Genres.Clear();
        foreach (var genre in selectedGenres)
        {
            movie.Genres.Add(genre);
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteMovieAsync(int id)
    {
        if (await _context.Showtimes.AnyAsync(s => s.MovieId == id) ||
            await _context.Reviews.AnyAsync(r => r.MovieId == id))
        {
            return false;
        }

        var movie = await _context.Movies
            .Include(m => m.Genres)
            .FirstOrDefaultAsync(m => m.MovieId == id);

        if (movie == null)
        {
            return false;
        }

        _context.Movies.Remove(movie);
        await _context.SaveChangesAsync();
        return true;
    }
}
