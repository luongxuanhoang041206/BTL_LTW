namespace MovieBooking.Services.Interfaces;

public record EmailInlineImage(string ContentId, byte[] Data, string MediaType);

public interface IEmailSenderService
{
    Task SendAsync(string to, string subject, string htmlBody, IEnumerable<EmailInlineImage>? inlineImages = null);
}
