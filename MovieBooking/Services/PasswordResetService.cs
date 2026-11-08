using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Models;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Services;

public class PasswordResetService : IPasswordResetService
{
    private readonly MovieBookingContext _db;
    private readonly IEmailSenderService _email;
    private readonly IConfiguration _config;
    private readonly ILogger<PasswordResetService> _log;

    public PasswordResetService(MovieBookingContext db, IEmailSenderService email,
        IConfiguration config, ILogger<PasswordResetService> log)
    { _db = db; _email = email; _config = config; _log = log; }

    private static string Hash(string raw) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));

    public async Task RequestResetAsync(string email)
    {
        email = email.Trim();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email && u.Status);
        if (user == null) return;

        var since = DateTime.UtcNow.AddSeconds(-60);
        if (await _db.PasswordResetTokens.AnyAsync(t => t.UserId == user.UserId && t.CreatedAt > since))
            return;

        var raw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');

        int ExpiredTimeInMinutes = 30;

        _db.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserId = user.UserId,
            TokenHash = Hash(raw),
            ExpiresAt = DateTime.UtcNow.AddMinutes(ExpiredTimeInMinutes),
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        var baseUrl = (_config["App:FrontendUrl"] ?? "").TrimEnd('/');
        var link = $"{baseUrl}/reset-password?token={raw}";
        var body = $"<p>Xin chào {System.Net.WebUtility.HtmlEncode(user.FullName)},</p>" +
                   $"<p>Bấm vào <a href=\"{link}\">liên kết này</a> để đặt lại mật khẩu. " +
                   "Liên kết có hiệu lực" + ExpiredTimeInMinutes + " phút và chỉ dùng được một lần.</p>" +
                   "<p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>";

        try { await _email.SendAsync(user.Email, "Đặt lại mật khẩu MovieBooking", body); }
        catch (Exception ex) {
            _log.LogError("Gửi mail đặt lại mật khẩu thất bại: {Type}", ex.GetType().Name); 
        }
    }

    public async Task<(bool Ok, string? Error)> ResetAsync(string token, string newPassword)
    {
        const string invalid = "Liên kết không hợp lệ hoặc đã hết hạn.";
        if (string.IsNullOrWhiteSpace(token)) return (false, invalid);
        if (newPassword is null || newPassword.Length < 6)
            return (false, "Mật khẩu phải có ít nhất 6 ký tự.");

        var hash = Hash(token);
        var rec = await _db.PasswordResetTokens.AsNoTracking()
            .FirstOrDefaultAsync(t => t.TokenHash == hash);
        if (rec == null || rec.UsedAt != null || rec.ExpiresAt < DateTime.UtcNow)
            return (false, invalid);

        var claimed = await _db.PasswordResetTokens
            .Where(t => t.TokenId == rec.TokenId && t.UsedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.UsedAt, DateTime.UtcNow));
        if (claimed == 0) return (false, invalid);

        var newHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        await _db.Users.Where(u => u.UserId == rec.UserId)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.PasswordHash, newHash));

        await _db.PasswordResetTokens
            .Where(t => t.UserId == rec.UserId && t.UsedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.UsedAt, DateTime.UtcNow));

        return (true, null);
    }
}
