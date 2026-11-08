using System.Net;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Services;

public class TicketEmailService : ITicketEmailService
{
    private readonly MovieBookingContext _db;
    private readonly IEmailSenderService _email;
    private readonly ILogger<TicketEmailService> _log;

    public TicketEmailService(MovieBookingContext db, IEmailSenderService email, ILogger<TicketEmailService> log)
    { _db = db; _email = email; _log = log; }

    public async Task SendOnPaidAsync(int bookingId)
    {
        try
        {
            var claimed = await _db.Bookings
                .Where(b => b.BookingId == bookingId && b.Status == "Paid"
                         && b.TicketCode != null && b.TicketEmailSentAt == null)
                .ExecuteUpdateAsync(s => s.SetProperty(b => b.TicketEmailSentAt, DateTime.UtcNow));
            if (claimed == 0) return;

            await SendOrRollbackAsync(bookingId);
        }
        catch (Exception ex)
        {
            _log.LogError("Gửi mail vé thất bại: {Type}", ex.GetType().Name);
        }
    }

    public async Task<(bool Ok, string? Error)> ResendAsync(int bookingId, int userId)
    {
        var cutoff = DateTime.UtcNow.AddMinutes(-2);
        var claimed = await _db.Bookings
            .Where(b => b.BookingId == bookingId && b.UserId == userId && b.Status == "Paid"
                     && b.TicketCode != null
                     && (b.TicketEmailSentAt == null || b.TicketEmailSentAt < cutoff))
            .ExecuteUpdateAsync(s => s.SetProperty(b => b.TicketEmailSentAt, DateTime.UtcNow));
        if (claimed == 0)
            return (false, "Không thể gửi lúc này. Đơn chưa thanh toán, hoặc bạn vừa yêu cầu gửi, vui lòng thử lại sau ít phút.");

        try
        {
            await SendOrRollbackAsync(bookingId);
            return (true, null);
        }
        catch (Exception ex)
        {
            _log.LogError("Gửi lại mail vé thất bại: {Type}", ex.GetType().Name);
            return (false, "Không gửi được email. Vui lòng thử lại sau.");
        }
    }

    private async Task SendOrRollbackAsync(int bookingId)
    {
        try { await SendCoreAsync(bookingId); }
        catch
        {
            await _db.Bookings.Where(b => b.BookingId == bookingId)
                .ExecuteUpdateAsync(s => s.SetProperty(b => b.TicketEmailSentAt, (DateTime?)null));
            throw;
        }
    }

    private async Task SendCoreAsync(int bookingId)
    {
        var b = await _db.Bookings.AsNoTracking()
            .Include(x => x.User)
            .Include(x => x.Showtime).ThenInclude(s => s.Movie)
            .Include(x => x.Showtime).ThenInclude(s => s.Room).ThenInclude(r => r.Cinema)
            .Include(x => x.BookingDetails).ThenInclude(d => d.ShowtimeSeat).ThenInclude(ss => ss.Seat)
            .FirstAsync(x => x.BookingId == bookingId);

        static string E(string? s) => WebUtility.HtmlEncode(s ?? "");

        var seats = string.Join(", ", b.BookingDetails
            .Select(d => $"{d.ShowtimeSeat.Seat.SeatRow}{d.ShowtimeSeat.Seat.SeatNumber}")
            .OrderBy(x => x));

        var html =
            "<div style='font-family:Arial,sans-serif;max-width:480px'>" +
            $"<h2>Vé xem phim #{b.BookingId}</h2>" +
            $"<p><b>{E(b.Showtime.Movie.Title)}</b></p>" +
            $"<p>Rạp: {E(b.Showtime.Room.Cinema.Name)} - {E(b.Showtime.Room.RoomName)}<br/>" +
            $"Suất chiếu: {b.Showtime.StartTime:HH:mm} ngày {b.Showtime.ShowDate:dd/MM/yyyy}<br/>" +
            $"Ghế: {E(seats)}<br/>" +
            "<p>Đưa mã QR dưới đây cho nhân viên khi vào rạp:</p>" +
            "<img src='cid:ticketqr' width='220' height='220' alt='QR vé' />" +
            $"<p>Mã vé: <b>{E(b.TicketCode)}</b></p>" +
            "</div>";

        await _email.SendAsync(
            b.User.Email,
            $"Vé xem phim #{b.BookingId} - {b.Showtime.Movie.Title}",
            html,
            new[] { new EmailInlineImage("ticketqr", TicketQr.Png(b.TicketCode!), "image/png") });
    }
}
