
namespace MovieBooking.Models;

public class FoodItem
{
    public int FoodItemId { get; set; }

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public string? ImageUrl { get; set; }

    public decimal Price { get; set; }

    public string Category { get; set; } = null!;

    public bool IsActive { get; set; } = true;

    public virtual ICollection<ComboDetail> ComboDetails { get; set; }
        = new List<ComboDetail>();
}
