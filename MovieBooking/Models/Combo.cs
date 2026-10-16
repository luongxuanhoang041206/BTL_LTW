
namespace MovieBooking.Models;

public class Combo
{
    public int ComboId { get; set; }

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public string? ImageUrl { get; set; }

    public decimal Price { get; set; }

    public bool IsActive { get; set; } = true;

    public virtual ICollection<ComboDetail> ComboDetails { get; set; }
        = new List<ComboDetail>();

    public virtual ICollection<BookingCombo> BookingCombos { get; set; }
        = new List<BookingCombo>();
}
