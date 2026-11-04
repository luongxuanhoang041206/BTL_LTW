using MovieBooking.DTOs;

namespace MovieBooking.Services.Interfaces;

public interface ICustomerService
{
    Task<List<AdminCustomerDto>> GetCustomersAsync(string? search);
    Task<CustomerStatusDto?> ToggleCustomerStatusAsync(int id);
    Task<List<AdminCustomerBookingDto>> GetCustomerBookingsAsync(int id);
}
