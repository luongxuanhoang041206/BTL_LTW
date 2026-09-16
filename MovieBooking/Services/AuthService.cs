using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.DTOs;
using MovieBooking.Models;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Services;

public class AuthService : IAuthService
{
    private readonly MovieBookingContext _context;

    public AuthService(MovieBookingContext context)
    {
        _context = context;
    }

    public async Task<(bool Success, string? ErrorMessage, User? User)> LoginAsync(string email, string password)
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            return (false, "Email và mật khẩu không được để trống.", null);
        }

        var emailNormalized = email.Trim().ToLower();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == emailNormalized);

        if (user == null || !user.Status || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
        {
            return (false, "Email hoặc mật khẩu không chính xác, hoặc tài khoản đã bị khóa.", null);
        }

        return (true, null, user);
    }

    public async Task<(bool Success, string? ErrorMessage)> RegisterAsync(RegisterViewModel model)
    {
        var emailNormalized = model.Email.Trim().ToLower();

        // Kiểm tra trùng lặp email
        bool exists = await _context.Users.AnyAsync(u => u.Email.ToLower() == emailNormalized);
        if (exists)
        {
            return (false, "Email này đã được sử dụng. Vui lòng chọn email khác.");
        }

        // Tạo mới User
        var newUser = new User
        {
            FullName = model.FullName.Trim(),
            Email = emailNormalized,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.Password),
            Phone = model.Phone?.Trim(),
            Role = "Customer",
            Status = true,
            CreatedAt = DateTime.Now
        };

        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        return (true, null);
    }
}
