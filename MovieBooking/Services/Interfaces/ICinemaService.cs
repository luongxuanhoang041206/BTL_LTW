using MovieBooking.DTOs;
using MovieBooking.DTOs.Cinema;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MovieBooking.Services.Interfaces;

public interface ICinemaService
{
    Task<List<CinemaDto>> GetAllCinemasAsync();
    Task<CinemaDto?> GetCinemaByIdAsync(int id);
    Task<bool> CinemaExistsAsync(int id);
    Task<PaginationResponseDto<AdminCinemaDto>> GetAdminCinemasAsync(CinemaQueryDto filter);
    Task<CinemaDto> CreateCinemaAsync(CinemaRequestDto request);
    Task<CinemaDto?> UpdateCinemaAsync(int id, CinemaRequestDto request);
    Task<(bool Success, string? Error, int RoomCount)> DeleteCinemaAsync(int id);
    Task<CinemaDetailDto?> GetAdminCinemaDetailAsync(int id); 
}
