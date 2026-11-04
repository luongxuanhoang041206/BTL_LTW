using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.DTOs;
using MovieBooking.DTOs.Cinema;
using MovieBooking.Models;
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

    public async Task<PaginationResponseDto<AdminCinemaDto>> GetAdminCinemasAsync(CinemaQueryDto filter)
    {
        var query = _context.Cinemas.AsNoTracking().AsQueryable();

        if(!string.IsNullOrWhiteSpace(filter.City))
        {
            var city = filter.City.Trim();
            query = query.Where(c => c.City == city);
        }

        if(!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var keyword = filter.Keyword.Trim();

            query = query.Where(c => c.Name.Contains(keyword));
        }

        if(!string.IsNullOrWhiteSpace(filter.Status))
        {
            var status = filter.Status.Trim();
            query = query.Where(c => c.Status == status);
        }

        var totalItems = await query.CountAsync();

        var page = Math.Max(filter.Page, 1);
        var pageSize = Math.Clamp(filter.PageSize, 1, 100);

        var cinemas = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new AdminCinemaDto
            {
                Id = c.CinemaId,
                Name = c.Name,
                Address = c.Address ?? string.Empty,
                City = c.City ?? string.Empty,
                Phone = c.Phone ?? string.Empty,
                Status = c.Status,
                RoomCount = c.Rooms.Count,

                ActiveShowsCount = c.Rooms
                .SelectMany(r => r.Showtimes)
                .Count(s => s.Status == "Active")
            }).ToListAsync();

        return new PaginationResponseDto<AdminCinemaDto>
        {
            Data = cinemas,
            CurrentPage = page,
            PageSize = pageSize,
            TotalItems = totalItems,
            TotalPages = (int)Math.Ceiling((double)totalItems / pageSize)
        };
    }

    public async Task<CinemaDto> CreateCinemaAsync(CinemaRequestDto request)
    {
        var cinema = new Cinema
        {
            Name = request.Name.Trim(),
            Address = request.Address?.Trim(),
            City = request.City?.Trim(),
            Phone = request.Phone?.Trim()
        };

        _context.Cinemas.Add(cinema);
        await _context.SaveChangesAsync();

        return new CinemaDto
        {
            CinemaId = cinema.CinemaId,
            Name = cinema.Name,
            Address = cinema.Address,
            City = cinema.City,
            Phone = cinema.Phone,
            TotalRooms = 0
        };
    }

    public async Task<CinemaDto?> UpdateCinemaAsync(int id, CinemaRequestDto request)
    {
        var cinema = await _context.Cinemas.FindAsync(id);
        if (cinema == null) return null;

        cinema.Name = request.Name.Trim();
        cinema.Address = request.Address?.Trim();
        cinema.City = request.City?.Trim();
        cinema.Phone = request.Phone?.Trim();
        await _context.SaveChangesAsync();

        return new CinemaDto
        {
            CinemaId = cinema.CinemaId,
            Name = cinema.Name,
            Address = cinema.Address,
            City = cinema.City,
            Phone = cinema.Phone,
            TotalRooms = await _context.Rooms.CountAsync(r => r.CinemaId == cinema.CinemaId)
        };
    }

    public async Task<(bool Success, string? Error, int RoomCount)> DeleteCinemaAsync(int id)
    {
        var cinema = await _context.Cinemas
            .Include(c => c.Rooms)
            .FirstOrDefaultAsync(c => c.CinemaId == id);

        if (cinema == null)
            return (false, "NotFound", 0);

        if (cinema.Rooms.Count > 0)
            return (false, "HasRooms", cinema.Rooms.Count);

        _context.Cinemas.Remove(cinema);
        await _context.SaveChangesAsync();
        return (true, null, 0);
    }

    public async Task<CinemaDetailDto?> GetAdminCinemaDetailAsync(int id)
    {
        return await _context.Cinemas
        .AsNoTracking()
        .Where(c => c.CinemaId == id)
        .Select(c => new CinemaDetailDto
        {
            Id = c.CinemaId,
            Name = c.Name,
            Address = c.Address ?? "",
            City = c.City ?? "",
            Phone = c.Phone ?? "",

            Rooms = c.Rooms.Select(r => new CinemaRoomDto
            {
                Id = r.RoomId,
                Name = r.RoomName,
                TotalSeats = r.Seats.Count()
            }).ToList()
        })
        .FirstOrDefaultAsync();
    }
}
