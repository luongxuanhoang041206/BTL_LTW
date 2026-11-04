namespace MovieBooking.DTOs;

public sealed record AdminCustomerDto(int Id, string FullName, string Email, string Phone, bool Status,
    string CreatedAt, int BookingCount, decimal TotalSpent);
public sealed record AdminCustomerBookingDto(int BookingId, string MovieTitle, string ShowDate,
    string StartTime, List<string> Seats, decimal TotalAmount, string Status, string BookingDate);
public sealed record CustomerStatusDto(int UserId, bool Status, string Message);
