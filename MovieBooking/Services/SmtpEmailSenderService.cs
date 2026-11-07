using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Models;
using MovieBooking.Services.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace MovieBooking.Services;

public class SmtpEmailSenderService : IEmailSenderService
{
    private readonly IConfiguration _config;
    private readonly IHostEnvironment _env;
    private readonly ILogger<SmtpEmailSenderService> _log;

    public SmtpEmailSenderService(IConfiguration config, IHostEnvironment env, ILogger<SmtpEmailSenderService> log)
    { _config = config; _env = env; _log = log; }

    public async Task SendAsync(string to, string subject, string htmlBody)
    {
        var user = _config["Email:Username"];
        var pass = _config["Email:AppPassword"];

        if (string.IsNullOrWhiteSpace(user) || string.IsNullOrWhiteSpace(pass))
        {
            if (_env.IsDevelopment())
            {
                _log.LogWarning("[DEV TEST] Mail đã gửi tới {To} | {Subject}\n{Body}", to, subject, htmlBody);
                return;
            }
            throw new InvalidOperationException("Chưa cấu hình Email:Username/AppPassword liên hệ Thành để lấy");
        }

        var msg = new MimeMessage();
        msg.From.Add(new MailboxAddress("MovieBooking", user));
        msg.To.Add(MailboxAddress.Parse(to));
        msg.Subject = subject;
        msg.Body = new BodyBuilder { HtmlBody = htmlBody }.ToMessageBody();

        using var smtp = new SmtpClient();
        await smtp.ConnectAsync("smtp.gmail.com", 587, SecureSocketOptions.StartTls);
        await smtp.AuthenticateAsync(user, pass);
        await smtp.SendAsync(msg);
        await smtp.DisconnectAsync(true);
    }
}
