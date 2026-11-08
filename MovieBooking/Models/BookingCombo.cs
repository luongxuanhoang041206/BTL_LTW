
namespace MovieBooking.Models;

public class BookingCombo
{
    public int BookingComboId { get; set; }

    public int BookingId { get; set; }

    public int ComboId { get; set; }

    public string ComboName { get; set; } = string.Empty;

    public int Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public virtual Booking Booking { get; set; } = null!;

    public virtual Combo Combo { get; set; } = null!;
}
