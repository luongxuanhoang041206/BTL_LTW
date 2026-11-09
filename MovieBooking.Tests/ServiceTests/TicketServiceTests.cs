using Microsoft.EntityFrameworkCore;
using MovieBooking.Models;
using MovieBooking.Services;
using MovieBooking.Tests.Helpers;

namespace MovieBooking.Tests.ServiceTests;

public class TicketServiceTests
{
    // 1. Vé đã soát bị từ chối khi quét lại và giữ nguyên thông tin check-in.
    [Fact]
    public async Task CheckInAsync_UsedTicketIsRejectedWithoutChangingCheckInData()
    {
        using var testDb = new SqliteTestDatabase();
        var seed = await PaymentServiceSeedHelper.SeedAsync(testDb.Context);
        var now = DateTime.Now;
        var booking = await testDb.Context.Bookings.SingleAsync(x => x.BookingId == seed.BookingId);
        booking.Status = "Paid";
        var payment = await testDb.Context.Payments.SingleAsync(x => x.PaymentId == seed.PaymentId);
        payment.PaymentStatus = "Success";
        var ticket = new Ticket
        {
            BookingDetailId = seed.BookingDetailId,
            TicketCode = $"TICKET-{Guid.NewGuid():N}",
            Qrtoken = $"QR-{Guid.NewGuid():N}",
            Status = "Used",
            IssuedAt = now.AddDays(-1),
            CheckedInAt = now.AddHours(-1),
            CheckedInByUserId = seed.UserId
        };
        testDb.Context.Tickets.Add(ticket);
        await testDb.Context.SaveChangesAsync();

        var result = await new TicketService(testDb.Context).CheckInAsync(ticket.Qrtoken, seed.UserId);

        Assert.False(result.Success);
        Assert.Equal("Vé đã được sử dụng.", result.Message);
        Assert.Equal("Used", result.Status);
        Assert.Equal(ticket.CheckedInAt, result.CheckedInAt);

        var savedTicket = await testDb.Context.Tickets.AsNoTracking()
            .SingleAsync(x => x.TicketId == ticket.TicketId);
        Assert.Equal("Used", savedTicket.Status);
        Assert.Equal(ticket.CheckedInAt, savedTicket.CheckedInAt);
        Assert.Equal(seed.UserId, savedTicket.CheckedInByUserId);
        var log = await testDb.Context.TicketCheckInLogs.AsNoTracking().SingleAsync();
        Assert.Equal("Rejected", log.Action);
    }
}
