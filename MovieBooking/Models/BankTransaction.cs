namespace MovieBooking.Models
{
    public class BankTransaction
    {
            public int Id { get; set; }
            public long ProviderTransactionId { get; set; }
            public string? ReferenceCode { get; set; }
            public decimal Amount { get; set; }
            public string? Content { get; set; }
            public int? PaymentId { get; set; }
            public string Result { get; set; } = "";
            public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
