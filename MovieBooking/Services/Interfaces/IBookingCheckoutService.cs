using MovieBooking.DTOs;

namespace MovieBooking.Services.Interfaces;

public interface IBookingCheckoutService
{
    Task<BookingCheckoutResult> CheckoutAsync(ApiCheckoutRequestDto request, int userId);
}
