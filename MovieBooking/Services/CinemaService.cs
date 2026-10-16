using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.DTOs;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Services;

public class CinemaService : ICinemaService
{
    private readonly MovieBookingContext _context;

    public CinemaService(MovieBookingContext context)
    {
        _context = context;
    }

    public async Task<List<CinemaDto>> GetAllCinemasAsync()
    {
        return await _context.Cinemas
            .AsNoTracking()
            .Select(c => new CinemaDto
            {
                CinemaId = c.CinemaId,
                Name = c.Name,
                Address = c.Address,
                City = c.City,
                Phone = c.Phone,
                TotalRooms = c.Rooms.Count
            })
            .ToListAsync();
    }

    public async Task<CinemaDto?> GetCinemaByIdAsync(int id)
    {
        return await _context.Cinemas
            .AsNoTracking()
            .Where(c => c.CinemaId == id)
            .Select(c => new CinemaDto
            {
                CinemaId = c.CinemaId,
                Name = c.Name,
                Address = c.Address,
                City = c.City,
                Phone = c.Phone,
                TotalRooms = c.Rooms.Count
            })
            .FirstOrDefaultAsync();
    }

    public async Task<bool> CinemaExistsAsync(int id)
    {
        return await _context.Cinemas.AnyAsync(c => c.CinemaId == id);
    }
}
