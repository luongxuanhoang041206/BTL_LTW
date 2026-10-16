namespace MovieBooking.DTOs;
    public record BankPaymentInfo(
    int PaymentId, decimal Amount, string Content,
    string QrUrl, string BankCode, string AccountNumber, string AccountName);