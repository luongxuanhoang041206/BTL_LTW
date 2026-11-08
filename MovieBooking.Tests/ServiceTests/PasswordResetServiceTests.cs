using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MovieBooking.Data;
using MovieBooking.Models;
using MovieBooking.Services;
using MovieBooking.Services.Interfaces;
using MovieBooking.Tests.Helpers;

namespace MovieBooking.Tests.Integration.Sqlite;

public class PasswordResetServiceTests : IDisposable
{
    private const string FrontendUrl = "https://app.test";
    private const string OldPassword = "old-password";

    private readonly SqliteTestDatabase _testDb = new();
    private readonly Mock<IEmailSenderService> _email = new();
    private readonly List<SentMail> _sent = new();
    private readonly PasswordResetService _sut;

    private MovieBookingContext Db => _testDb.Context;

    private record SentMail(string To, string Subject, string Body);

    public PasswordResetServiceTests()
    {
        _email
            .Setup(e => e.SendAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<IEnumerable<EmailInlineImage>?>()))
            .Callback<string, string, string, IEnumerable<EmailInlineImage>?>((to, subject, body, _) =>
                _sent.Add(new SentMail(to, subject, body)))
            .Returns(Task.CompletedTask);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["App:FrontendUrl"] = FrontendUrl + "/"
            })
            .Build();

        _sut = new PasswordResetService(
            Db,
            _email.Object,
            config,
            NullLogger<PasswordResetService>.Instance);
    }

    public void Dispose() => _testDb.Dispose();

    private static string Sha256(string raw) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));

    private async Task<User> SeedUserAsync(string email = "user@test.com", bool status = true)
    {
        var user = new User
        {
            Email = email,
            FullName = "Nguyen Van A",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(OldPassword),
            Role = "Customer",
            Status = status,
            CreatedAt = DateTime.UtcNow
        };
        Db.Users.Add(user);
        await Db.SaveChangesAsync();
        return user;
    }

    private async Task<PasswordResetToken> SeedTokenAsync(
        int userId,
        string raw,
        DateTime? expiresAt = null)
    {
        var token = new PasswordResetToken
        {
            UserId = userId,
            TokenHash = Sha256(raw),
            CreatedAt = DateTime.UtcNow.AddMinutes(-5),
            ExpiresAt = expiresAt ?? DateTime.UtcNow.AddMinutes(25)
        };
        Db.PasswordResetTokens.Add(token);
        await Db.SaveChangesAsync();
        return token;
    }

    private static string ExtractRawToken(string body)
    {
        var match = Regex.Match(body, @"token=([A-Za-z0-9_-]+)");
        Assert.True(match.Success);
        return match.Groups[1].Value;
    }

    private Task<PasswordResetToken> ReloadTokenAsync(int tokenId) =>
        Db.PasswordResetTokens.AsNoTracking().SingleAsync(token => token.TokenId == tokenId);

    private Task<User> ReloadUserAsync(int userId) =>
        Db.Users.AsNoTracking().SingleAsync(user => user.UserId == userId);

    // 1 User hợp lệ tạo token đã hash, gửi đúng một email chứa raw token và thời hạn khoảng 30 phút.
    [Fact]
    public async Task RequestResetAsync_ValidUser_SavesHashedTokenAndSendsEmail()
    {
        var user = await SeedUserAsync();
        var before = DateTime.UtcNow;

        await _sut.RequestResetAsync(user.Email);

        var mail = Assert.Single(_sent);
        Assert.Equal(user.Email, mail.To);
        _email.Verify(e => e.SendAsync(
            user.Email,
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<IEnumerable<EmailInlineImage>?>()), Times.Once);

        var rawToken = ExtractRawToken(mail.Body);
        Assert.Contains($"{FrontendUrl}/reset-password?token={rawToken}", mail.Body);

        var savedToken = await Db.PasswordResetTokens.AsNoTracking().SingleAsync();
        Assert.Equal(user.UserId, savedToken.UserId);
        Assert.Equal(Sha256(rawToken), savedToken.TokenHash);
        Assert.NotEqual(rawToken, savedToken.TokenHash);
        Assert.InRange(savedToken.ExpiresAt, before.AddMinutes(29), before.AddMinutes(31));
    }

    // 2 User không hoạt động không được tạo token hoặc gửi email.
    [Fact]
    public async Task RequestResetAsync_InactiveUser_DoesNotCreateTokenOrSendEmail()
    {
        await SeedUserAsync(status: false);

        await _sut.RequestResetAsync("user@test.com");

        Assert.Empty(await Db.PasswordResetTokens.ToListAsync());
        Assert.Empty(_sent);
        _email.Verify(e => e.SendAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<IEnumerable<EmailInlineImage>?>()), Times.Never);
    }

    // 3 Email không tồn tại không được tạo token hoặc gửi email.
    [Fact]
    public async Task RequestResetAsync_UnknownEmail_DoesNotCreateTokenOrSendEmail()
    {
        await _sut.RequestResetAsync("nobody@test.com");

        Assert.Empty(await Db.PasswordResetTokens.ToListAsync());
        Assert.Empty(_sent);
        _email.Verify(e => e.SendAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<IEnumerable<EmailInlineImage>?>()), Times.Never);
    }

    // 4 Token hợp lệ đổi mật khẩu thành công và được đánh dấu đã dùng.
    [Fact]
    public async Task ResetAsync_ValidToken_ChangesPasswordAndMarksTokenUsed()
    {
        var user = await SeedUserAsync();
        var token = await SeedTokenAsync(user.UserId, "raw-token");

        var (ok, error) = await _sut.ResetAsync("raw-token", "new-password");

        Assert.True(ok);
        Assert.Null(error);
        Assert.True(BCrypt.Net.BCrypt.Verify("new-password", (await ReloadUserAsync(user.UserId)).PasswordHash));
        Assert.NotNull((await ReloadTokenAsync(token.TokenId)).UsedAt);
    }

    // 5 Token hết hạn trả lỗi và không làm thay đổi mật khẩu.
    [Fact]
    public async Task ResetAsync_ExpiredToken_ReturnsErrorWithoutChangingPassword()
    {
        var user = await SeedUserAsync();
        await SeedTokenAsync(user.UserId, "expired-token", DateTime.UtcNow.AddMinutes(-1));

        var (ok, error) = await _sut.ResetAsync("expired-token", "new-password");

        Assert.False(ok);
        Assert.NotNull(error);
        Assert.True(BCrypt.Net.BCrypt.Verify(OldPassword, (await ReloadUserAsync(user.UserId)).PasswordHash));
    }

    // 6 Dùng lại cùng token lần thứ hai thất bại và không ghi đè mật khẩu đã đặt lần đầu.
    [Fact]
    public async Task ResetAsync_ReusedToken_FailsWithoutOverwritingPassword()
    {
        var user = await SeedUserAsync();
        await SeedTokenAsync(user.UserId, "raw-token");

        var first = await _sut.ResetAsync("raw-token", "first-password");
        var second = await _sut.ResetAsync("raw-token", "second-password");

        Assert.True(first.Ok);
        Assert.False(second.Ok);
        var passwordHash = (await ReloadUserAsync(user.UserId)).PasswordHash;
        Assert.True(BCrypt.Net.BCrypt.Verify("first-password", passwordHash));
        Assert.False(BCrypt.Net.BCrypt.Verify("second-password", passwordHash));
    }

    // 7 Reset vô hiệu hóa token khác của cùng user nhưng không ảnh hưởng token và mật khẩu của user khác.
    [Fact]
    public async Task ResetAsync_ValidToken_InvalidatesOnlyOtherTokensOfSameUser()
    {
        var user = await SeedUserAsync("a@test.com");
        var otherUser = await SeedUserAsync("b@test.com");
        var token = await SeedTokenAsync(user.UserId, "raw-token");
        var otherTokenForUser = await SeedTokenAsync(user.UserId, "other-user-token");
        var tokenForOtherUser = await SeedTokenAsync(otherUser.UserId, "other-account-token");

        var (ok, error) = await _sut.ResetAsync("raw-token", "new-password");

        Assert.True(ok);
        Assert.Null(error);
        Assert.NotNull((await ReloadTokenAsync(token.TokenId)).UsedAt);
        Assert.NotNull((await ReloadTokenAsync(otherTokenForUser.TokenId)).UsedAt);
        Assert.Null((await ReloadTokenAsync(tokenForOtherUser.TokenId)).UsedAt);
        Assert.True(BCrypt.Net.BCrypt.Verify("new-password", (await ReloadUserAsync(user.UserId)).PasswordHash));
        Assert.True(BCrypt.Net.BCrypt.Verify(OldPassword, (await ReloadUserAsync(otherUser.UserId)).PasswordHash));
    }
}
