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

    public MovieService(MovieBookingContext context)
    {
        _context = context;
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

    public async Task<IEnumerable<Movie>> GetNowShowingMoviesAsync()
    {
        return await _context.Movies
            .Include(m => m.Genres)
            .Where(m => m.Status == "Showing" || m.Status == "NowShowing")
            .AsNoTracking()
            .OrderByDescending(m => m.ReleaseDate)
            .ToListAsync();
    }

    public async Task<IEnumerable<Movie>> GetComingSoonMoviesAsync()
    {
        return await _context.Movies
            .Include(m => m.Genres)
            .Where(m => m.Status == "Coming Soon" || m.Status == "ComingSoon")
            .AsNoTracking()
            .OrderByDescending(m => m.ReleaseDate)
            .ToListAsync();
    }

    public async Task<IEnumerable<Genre>> GetAllGenresAsync()
    {
        return await _context.Genres
            .OrderBy(g => g.GenreName)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<Movie?> GetMovieByIdAsync(int id)
    {
        return await _context.Movies
            .Include(m => m.Genres)
            .Include(m => m.Reviews)
            .FirstOrDefaultAsync(m => m.MovieId == id);
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
