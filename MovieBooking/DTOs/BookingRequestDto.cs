namespace MovieBooking.DTOs;

public sealed class PromoRequestDto
{
    public string? PromoCode { get; set; }
}

public sealed class ApiHoldSeatsRequestDto
{
    public int ShowtimeId { get; set; }
    public List<int> SeatIds { get; set; } = new();
}

public sealed class ApiCheckoutRequestDto
{
    public int ShowtimeId { get; set; }
    public List<int> SeatIds { get; set; } = new();
    public string? PromoCode { get; set; }
    public string PaymentMethod { get; set; } = "VNPay";
    public List<BookingComboItemRequest>? Combos { get; set; }
    public List<BookingFoodItemRequest>? Foods { get; set; }
}

public sealed record BookingCheckoutResult(bool Success, int? BookingId, string? Error, bool IncludeSuccessFlag);
