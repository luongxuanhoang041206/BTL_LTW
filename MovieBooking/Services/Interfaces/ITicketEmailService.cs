namespace MovieBooking.Services.Interfaces;

public interface ITicketEmailService
{
	Task SendOnPaidAsync(int bookingId);
	Task<(bool Ok, string? Error)> ResendAsync(int bookingId, int userId);
}