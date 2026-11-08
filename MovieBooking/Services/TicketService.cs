using System;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.DTOs;
using MovieBooking.Models;
using MovieBooking.Services.Interfaces;
using QRCoder;

namespace MovieBooking.Services;

public class TicketService : ITicketService
{
    private readonly MovieBookingContext _context;

    public TicketService(MovieBookingContext context)
    {
        _context = context;
    }

    private static string StatusLabel(string status) => status switch
    {
        "Issued" => "Chưa sử dụng",
        "Used" => "Đã sử dụng",
        "Cancelled" => "Đã hủy",
        _ => "Không xác định"
    };

    public async Task<BookingTicketsViewModel?> GetBookingTicketsAsync(int bookingId, int userId)
    {
        var booking = await _context.Bookings
            .AsNoTracking()
            .Include(b => b.Showtime).ThenInclude(s => s.Movie)
            .Include(b => b.Showtime).ThenInclude(s => s.Room).ThenInclude(r => r.Cinema)
            .Include(b => b.BookingDetails).ThenInclude(d => d.ShowtimeSeat).ThenInclude(ss => ss.Seat)
            .Include(b => b.Payments)
            .FirstOrDefaultAsync(b => b.BookingId == bookingId && b.UserId == userId);

        if (booking == null) return null;

        var detailIds = booking.BookingDetails.Select(d => d.BookingDetailId).ToList();
        var tickets = await _context.Tickets
            .AsNoTracking()
            .Where(t => detailIds.Contains(t.BookingDetailId))
            .ToListAsync();
        var ticketByDetail = tickets.ToDictionary(t => t.BookingDetailId);

        var ticketDtos = booking.BookingDetails
            .OrderBy(d => d.ShowtimeSeat.Seat.SeatRow)
            .ThenBy(d => d.ShowtimeSeat.Seat.SeatNumber)
            .Select(d =>
            {
                ticketByDetail.TryGetValue(d.BookingDetailId, out var ticket);
                var seatLabel = $"{d.ShowtimeSeat.Seat.SeatRow}{d.ShowtimeSeat.Seat.SeatNumber}";
                return new TicketDto
                {
                    TicketId = ticket?.TicketId ?? 0,
                    BookingDetailId = d.BookingDetailId,
                    TicketCode = ticket?.TicketCode ?? string.Empty,
                    QrImageUrl = ticket != null ? $"/api/tickets/{ticket.TicketId}/qr" : null,
                    Status = ticket?.Status ?? "NotIssued",
                    StatusLabel = StatusLabel(ticket?.Status ?? "NotIssued"),
                    IssuedAt = ticket?.IssuedAt,
                    CheckedInAt = ticket?.CheckedInAt,
                    SeatLabel = seatLabel,
                    SeatType = d.ShowtimeSeat.Seat.SeatType,
                    Price = d.Price
                };
            })
            .ToList();

        return new BookingTicketsViewModel
        {
            BookingId = booking.BookingId,
            BookingCode = "MB-" + booking.BookingId.ToString("D6"),
            BookingStatus = booking.Status,
            PaymentStatus = booking.Payments
                .OrderByDescending(p => p.PaymentId)
                .FirstOrDefault()?.PaymentStatus,
            MovieTitle = booking.Showtime.Movie.Title,
            PosterUrl = booking.Showtime.Movie.PosterUrl,
            CinemaName = booking.Showtime.Room.Cinema.Name,
            RoomName = booking.Showtime.Room.RoomName,
            ShowDate = booking.Showtime.ShowDate,
            StartTime = booking.Showtime.StartTime,
            EndTime = booking.Showtime.EndTime,
            Tickets = ticketDtos
        };
    }

    public async Task<byte[]?> GetTicketQrPngAsync(int ticketId, int userId)
    {
        // Chỉ chủ booking của vé mới được tải mã QR.
        var token = await _context.Tickets
            .AsNoTracking()
            .Where(t => t.TicketId == ticketId &&
                        _context.BookingDetails.Any(d => d.BookingDetailId == t.BookingDetailId &&
                                                         _context.Bookings.Any(b => b.BookingId == d.BookingId && b.UserId == userId)))
            .Select(t => t.Qrtoken)
            .FirstOrDefaultAsync();

        if (string.IsNullOrEmpty(token)) return null;

        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(token, QRCodeGenerator.ECCLevel.Q);
        return new PngByteQRCode(data).GetGraphic(10);
    }

    public async Task<TicketCheckInResultDto> CheckInAsync(string qrToken, int staffId)
    {
        if (string.IsNullOrWhiteSpace(qrToken))
            return Fail("Mã QR không hợp lệ.");

        await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var ticket = await _context.Tickets.FirstOrDefaultAsync(t => t.Qrtoken == qrToken);
            if (ticket == null)
                return Fail("Vé không tồn tại.");

            var detail = await _context.BookingDetails
                .Include(d => d.ShowtimeSeat).ThenInclude(ss => ss.Seat)
                .Include(d => d.ShowtimeSeat).ThenInclude(ss => ss.Showtime).ThenInclude(s => s.Movie)
                .Include(d => d.ShowtimeSeat).ThenInclude(ss => ss.Showtime).ThenInclude(s => s.Room).ThenInclude(r => r.Cinema)
                .Include(d => d.Booking).ThenInclude(b => b.Payments)
                .FirstOrDefaultAsync(d => d.BookingDetailId == ticket.BookingDetailId);

            if (detail == null)
            {
                await WriteLogAsync(ticket.TicketId, staffId, "Rejected", "Không tìm thấy thông tin ghế của vé.");
                await transaction.CommitAsync();
                return Fail("Vé không hợp lệ.");
            }

            var booking = detail.Booking;
            var showtime = detail.ShowtimeSeat.Showtime;
            var seatLabel = $"{detail.ShowtimeSeat.Seat.SeatRow}{detail.ShowtimeSeat.Seat.SeatNumber}";

            // 1. Vé đã bị hủy
            if (ticket.Status == "Cancelled")
            {
                await WriteLogAsync(ticket.TicketId, staffId, "Rejected", "Vé đã bị hủy.");
                await transaction.CommitAsync();
                return Fail("Vé đã bị hủy.", ticket, detail, seatLabel);
            }

            // 2. Vé đã được sử dụng trước đó
            if (ticket.Status == "Used")
            {
                await WriteLogAsync(ticket.TicketId, staffId, "Rejected", "Vé đã được sử dụng trước đó.");
                await transaction.CommitAsync();
                return Fail("Vé đã được sử dụng.", ticket, detail, seatLabel);
            }

            // 3. Booking phải ở trạng thái Paid
            if (booking.Status != "Paid")
            {
                await WriteLogAsync(ticket.TicketId, staffId, "Rejected", $"Booking chưa thanh toán (Status={booking.Status}).");
                await transaction.CommitAsync();
                return Fail("Thanh toán chưa thành công.", ticket, detail, seatLabel);
            }

            // 4. Phải có giao dịch Success
            if (!booking.Payments.Any(p => p.PaymentStatus == "Success"))
            {
                await WriteLogAsync(ticket.TicketId, staffId, "Rejected", "Không có giao dịch thanh toán thành công.");
                await transaction.CommitAsync();
                return Fail("Thanh toán chưa thành công.", ticket, detail, seatLabel);
            }

            // 5. Suất chiếu phải còn hợp lệ
            if (showtime == null || showtime.Status != "Active")
            {
                await WriteLogAsync(ticket.TicketId, staffId, "Rejected", "Suất chiếu không còn hoạt động.");
                await transaction.CommitAsync();
                return Fail("Suất chiếu không còn hợp lệ.", ticket, detail, seatLabel);
            }

            // 6. Cập nhật có điều kiện (chống race condition khi 2 nhân viên quét đồng thời)
            var now = DateTime.Now;
            var affected = await _context.Tickets
                .Where(t => t.TicketId == ticket.TicketId && t.Status == "Issued")
                .ExecuteUpdateAsync(s => s
                    .SetProperty(t => t.Status, "Used")
                    .SetProperty(t => t.CheckedInAt, now)
                    .SetProperty(t => t.CheckedInByUserId, staffId));

            if (affected == 0)
            {
                await WriteLogAsync(ticket.TicketId, staffId, "Rejected", "Vé đã được sử dụng bởi nhân viên khác.");
                await transaction.CommitAsync();
                return Fail("Vé đã được sử dụng.", ticket, detail, seatLabel);
            }

            await WriteLogAsync(ticket.TicketId, staffId, "CheckedIn", "Check-in thành công.");
            await transaction.CommitAsync();

            return new TicketCheckInResultDto
            {
                Success = true,
                Message = "Vé hợp lệ. Check-in thành công!",
                TicketCode = ticket.TicketCode,
                Status = "Used",
                MovieTitle = showtime.Movie.Title,
                CinemaName = showtime.Room.Cinema.Name,
                RoomName = showtime.Room.RoomName,
                ShowDate = showtime.ShowDate.ToString("dd/MM/yyyy"),
                StartTime = showtime.StartTime.ToString("HH:mm"),
                SeatLabel = seatLabel,
                CheckedInAt = now
            };
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            return Fail("Không thể check-in lúc này. Vui lòng thử lại.");
        }
    }

    private async Task WriteLogAsync(int ticketId, int staffId, string action, string message)
    {
        _context.TicketCheckInLogs.Add(new TicketCheckInLog
        {
            TicketId = ticketId,
            StaffId = staffId,
            Action = action,
            Message = message,
            CreatedAt = DateTime.Now
        });
        await _context.SaveChangesAsync();
    }

    private static TicketCheckInResultDto Fail(string message) => new()
    {
        Success = false,
        Message = message
    };

    private static TicketCheckInResultDto Fail(string message, Ticket ticket, BookingDetail detail, string seatLabel)
    {
        var showtime = detail.ShowtimeSeat.Showtime;
        return new TicketCheckInResultDto
        {
            Success = false,
            Message = message,
            TicketCode = ticket.TicketCode,
            Status = ticket.Status,
            MovieTitle = showtime?.Movie?.Title,
            CinemaName = showtime?.Room?.Cinema?.Name,
            RoomName = showtime?.Room?.RoomName,
            ShowDate = showtime?.ShowDate.ToString("dd/MM/yyyy"),
            StartTime = showtime?.StartTime.ToString("HH:mm"),
            SeatLabel = seatLabel,
            CheckedInAt = ticket.CheckedInAt
        };
    }
}
