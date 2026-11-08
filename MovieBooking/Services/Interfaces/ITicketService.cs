using System.Threading.Tasks;
using MovieBooking.DTOs;

namespace MovieBooking.Services.Interfaces;

/// <summary>
/// Truy vấn vé điện tử và check-in tại rạp.
/// </summary>
public interface ITicketService
{
    /// <summary>
    /// Lấy danh sách vé của một booking. Chỉ chủ booking được xem.
    /// Trả về null nếu booking không tồn tại hoặc không thuộc user.
    /// </summary>
    Task<BookingTicketsViewModel?> GetBookingTicketsAsync(int bookingId, int userId);

    /// <summary>
    /// Sinh ảnh PNG cho QR của một vé (từ QRToken). Chỉ chủ booking được tải.
    /// Trả về null nếu không tìm thấy vé hoặc không có quyền.
    /// </summary>
    Task<byte[]?> GetTicketQrPngAsync(int ticketId, int userId);

    /// <summary>
    /// Check-in vé bằng QRToken. Xác thực đầy đủ điều kiện và chống check-in trùng.
    /// staffId lấy từ phiên đăng nhập hiện tại.
    /// </summary>
    Task<TicketCheckInResultDto> CheckInAsync(string qrToken, int staffId);
}
