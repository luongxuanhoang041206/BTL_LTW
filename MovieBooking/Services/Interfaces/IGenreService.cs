using System.Collections.Generic;
using System.Threading.Tasks;
using MovieBooking.DTOs;
using MovieBooking.Models;

namespace MovieBooking.Services.Interfaces;

public interface IGenreService
{
    Task<IEnumerable<GenreMovieCountDto>> GetAllGenresAsync(string? search = null, int? page = null, int pageSize = 10);

    Task<Genre?> GetGenreByIdAsync(int id);

    Task<bool> GenreNameExistsAsync(string name, int? exceptGenreId = null);

    Task<Genre> CreateGenreAsync(string name);

    Task<(bool Success, string? ErrorMessage)> UpdateGenreAsync(int id, string name);

    Task<(bool Success, string? ErrorMessage)> DeleteGenreAsync(int id);
}
