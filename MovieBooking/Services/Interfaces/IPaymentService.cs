using MovieBooking.DTOs;
using System.Threading.Tasks;

namespace MovieBooking.Services.Interfaces;

public interface IPaymentService
{
    Task<(bool Success, int? PaymentId, string? Error)> ProcessPaymentAsync(
        int bookingId,
        int userId,
        string method,
        bool simulateFailure = false);

    /// <summary>
    /// Xử lý thanh toán cho một booking.
    /// Tạo Payment record, cập nhật trạng thái Booking.
    /// Trả về (Success, PaymentId, Error). va ca PaymentUrl
    /// </summary>
    Task<(bool Success, int? PaymentId, string? PaymentUrl, string? Error)> InitializePaymentAsync(
        int bookingId,
        int userId,
        string method,
        string ipAddress);

    Task<(bool Success, string? Error)> ConfirmPaymentResultAsync(
        int paymentId,
        string transactionCode,
        bool isSuccessFromGateway);

    Task ProcessBankTransferAsync(SePayWebhookDto dto);

    Task<(bool Success, BankPaymentInfo? Info, string? Error)> CreateBankPaymentAsync(int bookingId, int userId);
}
