using System.Threading.Tasks;

namespace MovieBooking.Services.Interfaces;

public interface IPaymentService
{
    /// <summary>
    /// Xử lý thanh toán cho một booking.
    /// Tạo Payment record, cập nhật trạng thái Booking.
    /// Trả về (Success, PaymentId, Error).
    /// </summary>
    Task<(bool Success, int? PaymentId, string? Error)> ProcessPaymentAsync(
        int bookingId,
        int userId,
        string method,
        bool simulateFailure = false);
}
