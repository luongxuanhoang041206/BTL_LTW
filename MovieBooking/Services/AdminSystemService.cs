using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.DTOs;
using MovieBooking.Models;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Services;

public sealed class AdminSystemService(MovieBookingContext context) : IAdminSystemService
{
    private static SystemSettingsDto _settings = new();

    public async Task<List<AdminStaffUserDto>> GetStaffUsersAsync() => await context.Users
        .Where(user => user.Role == "Admin" || user.Role == "Staff")
        .AsNoTracking()
        .OrderByDescending(user => user.CreatedAt)
        .Select(user => new AdminStaffUserDto(user.UserId, user.FullName, user.Email, user.Phone ?? "",
            user.Role, user.Status, user.CreatedAt.ToString("yyyy-MM-dd")))
        .ToListAsync();

    public async Task<(int? Id, string? Error)> CreateStaffUserAsync(StaffUserFormDto request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.Email))
            return (null, "NameOrEmailRequired");
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
            return (null, "PasswordTooShort");
        var email = request.Email.Trim().ToLower();
        if (await context.Users.AnyAsync(user => user.Email.ToLower() == email)) return (null, "EmailExists");

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Phone = request.Phone?.Trim(),
            Role = request.Role == "Admin" ? "Admin" : "Staff",
            Status = request.Status,
            CreatedAt = DateTime.Now
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return (user.UserId, null);
    }

    public async Task<bool> UpdateStaffUserAsync(int id, StaffUserFormDto request)
    {
        var user = await context.Users.FindAsync(id);
        if (user == null) return false;
        user.FullName = request.FullName.Trim();
        user.Phone = request.Phone?.Trim();
        user.Role = request.Role == "Admin" ? "Admin" : "Staff";
        user.Status = request.Status;
        if (!string.IsNullOrWhiteSpace(request.Password))
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        await context.SaveChangesAsync();
        return true;
    }

    public SystemSettingsDto GetSystemSettings() => _settings;

    public SystemSettingsDto UpdateSystemSettings(SystemSettingsDto settings)
    {
        _settings = settings;
        return _settings;
    }
}
