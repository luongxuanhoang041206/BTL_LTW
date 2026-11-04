using MovieBooking.DTOs;

namespace MovieBooking.Services.Interfaces;

public interface IAdminSystemService
{
    Task<List<AdminStaffUserDto>> GetStaffUsersAsync();
    Task<(int? Id, string? Error)> CreateStaffUserAsync(StaffUserFormDto request);
    Task<bool> UpdateStaffUserAsync(int id, StaffUserFormDto request);
    Task<List<SystemRoleDto>> GetSystemRolesAsync();
    Task<List<SystemAuditLogDto>> GetAuditLogsAsync();
    SystemSettingsDto GetSystemSettings();
    SystemSettingsDto UpdateSystemSettings(SystemSettingsDto settings);
}
