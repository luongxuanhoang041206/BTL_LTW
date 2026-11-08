using MovieBooking.DTOs;

namespace MovieBooking.Services.Interfaces;

public interface ISystemSettingsService
{
    Task<SystemSettingsDto> GetAsync();
    Task<(SystemSettingsDto? Settings, string? Error)> UpdateAsync(SystemSettingsDto settings, int? updatedByUserId);
}