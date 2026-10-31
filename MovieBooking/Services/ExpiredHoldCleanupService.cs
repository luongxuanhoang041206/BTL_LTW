using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;

namespace MovieBooking.Services;

public class ExpiredHoldCleanupService : BackgroundService
{
    private const int GraceMinutes = 2; // chờ thêm để webhook trễ vài giây vẫn kịp

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ExpiredHoldCleanupService> _logger;

    public ExpiredHoldCleanupService(IServiceScopeFactory scopeFactory,
        ILogger<ExpiredHoldCleanupService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try { await CleanupAsync(stoppingToken); }
            catch (Exception ex) { _logger.LogError(ex, "Cleanup expired holds failed"); }

            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }

    private async Task CleanupAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<MovieBookingContext>();

        var cutoff = DateTime.Now.AddMinutes(-GraceMinutes);

        var expired = await db.Bookings
            .Where(b => b.Status == "Pending" &&
                        b.BookingDetails.Any(d => d.ShowtimeSeat.Status == "Holding"
                                               && d.ShowtimeSeat.HoldExpiresAt < cutoff))
            .Select(b => new { b.BookingId, b.UserId })
            .ToListAsync(ct);

        var released = 0;

        foreach (var b in expired)
        {
            await using var tx = await db.Database.BeginTransactionAsync(ct);

            // 1) Khóa payment trước: chỉ đổi Pending -> Failed. Nếu webhook đã chuyển Success
            //    thì dòng này không đụng tới, và bước 2 sẽ thấy booking không còn Pending.
            await db.Payments
                .Where(p => p.BookingId == b.BookingId && p.PaymentStatus == "Pending")
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.PaymentStatus, "Failed"), ct);

            // 2) Hủy booking, chỉ khi nó vẫn còn Pending
            var cancelled = await db.Bookings
                .Where(x => x.BookingId == b.BookingId && x.Status == "Pending")
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, "Cancelled"), ct);

            if (cancelled == 0)
            {
                await tx.RollbackAsync(ct); // booking đã được xử lý nơi khác, hoàn tác bước 1
                continue;
            }

            // 3) Chỉ nhả ghế còn đang Holding và thuộc về chính chủ booking này
            await db.ShowtimeSeats
                .Where(ss => ss.BookingDetail != null
                          && ss.BookingDetail.BookingId == b.BookingId
                          && ss.Status == "Holding"
                          && ss.LockedByUserId == b.UserId)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(ss => ss.Status, "Available")
                    .SetProperty(ss => ss.HoldExpiresAt, (DateTime?)null)
                    .SetProperty(ss => ss.LockedByUserId, (int?)null), ct);
            // Xóa chi tiết ghế để ghế được đặt lại
            await db.BookingDetails
                .Where(d => d.BookingId == b.BookingId)
                .ExecuteDeleteAsync(ct);
            await tx.CommitAsync(ct);
            released++;
        }

        if (released > 0)
            _logger.LogInformation("Released {Count} expired bookings", released);
    }
}