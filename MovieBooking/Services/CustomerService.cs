using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.DTOs;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Services;

public sealed class CustomerService(MovieBookingContext context) : ICustomerService
{
    public async Task<List<AdminCustomerDto>> GetCustomersAsync(string? search)
    {
        var query = context.Users
            .Where(user => user.Role == "Customer")
            .AsNoTracking()
            .AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(user => user.FullName.ToLower().Contains(term) || user.Email.ToLower().Contains(term) ||
                (user.Phone != null && user.Phone.Contains(term)));
        }

        return await query.OrderByDescending(user => user.CreatedAt)
            .Select(user => new AdminCustomerDto(
                user.UserId, user.FullName, user.Email, user.Phone ?? "---", user.Status,
                user.CreatedAt.ToString("yyyy-MM-dd"), user.Bookings.Count,
                user.Bookings.Where(booking => booking.Status == "Confirmed").Sum(booking => (decimal?)booking.TotalAmount) ?? 0))
            .ToListAsync();
    }

    public async Task<CustomerStatusDto?> ToggleCustomerStatusAsync(int id)
    {
        var user = await context.Users.FindAsync(id);
        if (user == null) return null;
        user.Status = !user.Status;
        await context.SaveChangesAsync();
        return new CustomerStatusDto(user.UserId, user.Status,
            user.Status ? "Mở khóa tài khoản thành công!" : "Đã khóa tài khoản khách hàng!");
    }

    public async Task<List<AdminCustomerBookingDto>> GetCustomerBookingsAsync(int id) => await context.Bookings
        .AsNoTracking()
        .Where(booking => booking.UserId == id)
        .OrderByDescending(booking => booking.BookingDate)
        .Select(booking => new AdminCustomerBookingDto(
            booking.BookingId,
            booking.Showtime.Movie.Title,
            booking.Showtime.ShowDate.ToString("yyyy-MM-dd"),
            booking.Showtime.StartTime.ToString("HH:mm"),
            booking.BookingDetails.Select(detail => detail.ShowtimeSeat.Seat.SeatRow + detail.ShowtimeSeat.Seat.SeatNumber).ToList(),
            booking.TotalAmount,
            booking.Status,
            booking.BookingDate.ToString("yyyy-MM-dd HH:mm")))
        .ToListAsync();
}
