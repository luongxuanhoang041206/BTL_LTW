using MovieBooking.DTOs;
using MovieBooking.DTOs.Showtime;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MovieBooking.Services.Interfaces;

public interface IShowtimeService
{
    Task<List<AdminShowtimeResponseDto>> GetAdminShowtimeResponsesAsync();
    Task<List<ShowtimeListDto>> GetAdminShowtimesAsync();
    Task<(bool Success, int? ShowtimeId, string? Error)> CreateShowtimeAsync(
        int movieId, int roomId, string date, string startTime, decimal price, decimal? vipMultiplier);
    Task<(bool Success, string? Error)> UpdateShowtimeAsync(
        int id, int? movieId, int? roomId, string? date, string? startTime, decimal? price,
        decimal? vipMultiplier, string? status);
    Task<(bool Success, string? Error)> ChangeShowtimeStatusAsync(int id, string status);
    Task<(bool Success, string? Error)> CancelShowtimeAsync(int id);
    Task<(bool Success, string? Error)> CompleteShowtimeAsync(int id);
    Task<(bool Success, string? Error)> DeleteShowtimeAsync(int id);

    Task<PaginationResponseDto<AdminShowtimeDto>> GetAdminShowtimesAsync(ShowtimeQueryDto filter);

    Task<AdminShowtimeDto?> GetShowtimeByIdAsync(int id);

    Task<ShowtimeCalendarResponseDto> GetCalendarAsync(ShowtimeCalendarQueryDto filter);
}
