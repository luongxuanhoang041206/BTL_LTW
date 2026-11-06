using MovieBooking.DTOs;

namespace MovieBooking.Services.Interfaces;

public interface IAdminSystemService
{
    Task<List<AdminStaffUserDto>> GetStaffUsersAsync();
    Task<(int? Id, string? Error)> CreateStaffUserAsync(StaffUserFormDto request);
    Task<bool> UpdateStaffUserAsync(int id, StaffUserFormDto request);
    SystemSettingsDto GetSystemSettings();
    SystemSettingsDto UpdateSystemSettings(SystemSettingsDto settings);
}
