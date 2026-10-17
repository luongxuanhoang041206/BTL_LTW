namespace MovieBooking.Models;

public class BookingFood
{
    public int BookingFoodId { get; set; }
    public int BookingId { get; set; }
    public int FoodItemId { get; set; }
    public string FoodName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public virtual Booking Booking { get; set; } = null!;
    public virtual FoodItem FoodItem { get; set; } = null!;
}
