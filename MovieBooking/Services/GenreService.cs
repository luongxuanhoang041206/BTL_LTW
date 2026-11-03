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

public class GenreService : IGenreService
{
    private readonly MovieBookingContext _context;

    public GenreService(MovieBookingContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<GenreMovieCountDto>> GetAllGenresAsync(string? search = null, int? page = null, int pageSize = 10)
    {
        var query = _context.Genres.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim().ToLower();
            query = query.Where(g => g.GenreName.ToLower().Contains(keyword));
        }

        query = query.OrderBy(g => g.GenreName);

        if (page.HasValue && pageSize > 0)
        {
            pageSize = Math.Max(1, pageSize);
            page = Math.Max(1, page.Value);
            query = query.Skip((page.Value - 1) * pageSize).Take(pageSize);
        }

        return await query.Select(g => new GenreMovieCountDto
        {
            GenreId = g.GenreId,
            Name = g.GenreName,
            MovieCount = g.Movies.Count
        })
        .ToListAsync();
    }

    public async Task<Genre?> GetGenreByIdAsync(int id)
    {
        return await _context.Genres
            .Include(g => g.Movies)
            .FirstOrDefaultAsync(g => g.GenreId == id);
    }

    public async Task<bool> GenreNameExistsAsync(string name, int? exceptGenreId = null)
    {
        var normalized = name.Trim().ToLower();
        return await _context.Genres.AnyAsync(g =>
            g.GenreName.ToLower() == normalized &&
            (!exceptGenreId.HasValue || g.GenreId != exceptGenreId.Value));
    }

    public async Task<Genre> CreateGenreAsync(string name)
    {
        var genre = new Genre { GenreName = name.Trim() };
        _context.Genres.Add(genre);
        await _context.SaveChangesAsync();
        return genre;
    }

    public async Task<(bool Success, string? ErrorMessage)> UpdateGenreAsync(int id, string name)
    {
        var genre = await _context.Genres.FindAsync(id);
        if (genre == null)
        {
            return (false, "Không tìm thấy thể loại.");
        }

        var trimmed = name.Trim();
        if (await GenreNameExistsAsync(trimmed, id))
        {
            return (false, "Tên thể loại đã được sử dụng.");
        }

        genre.GenreName = trimmed;
        await _context.SaveChangesAsync();
        return (true, null);
    }

    public async Task<(bool Success, string? ErrorMessage)> DeleteGenreAsync(int id)
    {
        var genre = await _context.Genres
            .Include(g => g.Movies)
            .FirstOrDefaultAsync(g => g.GenreId == id);

        if (genre == null)
        {
            return (false, "Không tìm thấy thể loại.");
        }

        if (genre.Movies.Count > 0)
        {
            return (false, $"Không thể xóa thể loại vì đang có {genre.Movies.Count} phim liên kết.");
        }

        _context.Genres.Remove(genre);
        await _context.SaveChangesAsync();
        return (true, null);
    }
}
