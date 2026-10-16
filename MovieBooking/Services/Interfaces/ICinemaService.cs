using System.Collections.Generic;
using System.Threading.Tasks;
using MovieBooking.DTOs;

namespace MovieBooking.Services.Interfaces;

public interface ICinemaService
{
    Task<List<CinemaDto>> GetAllCinemasAsync();
    Task<CinemaDto?> GetCinemaByIdAsync(int id);
    Task<bool> CinemaExistsAsync(int id);
}
