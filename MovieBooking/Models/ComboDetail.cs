
namespace MovieBooking.Models;

public class ComboDetail
{
    public int ComboId { get; set; }

    public int FoodItemId { get; set; }

    public int Quantity { get; set; }

    public virtual Combo Combo { get; set; } = null!;

    public virtual FoodItem FoodItem { get; set; } = null!;
}
