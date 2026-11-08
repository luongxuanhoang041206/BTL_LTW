namespace MovieBooking.Services.Interfaces;

public interface IPasswordResetService
{
    Task RequestResetAsync(string email);

    Task<(bool Ok, string? Error)> ResetAsync(string token, string newPassword);
}
