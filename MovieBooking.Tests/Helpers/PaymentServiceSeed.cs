using MovieBooking.Data;
using MovieBooking.Models;

namespace MovieBooking.Tests.Helpers;

public sealed record PaymentServiceSeed(
    int UserId,
    int CinemaId,
    int RoomId,
    int MovieId,
    int ShowtimeId,
    int SeatId,
    int ShowtimeSeatId,
    int BookingId,
    int BookingDetailId,
    int PaymentId,
    long ProviderTransactionId,
    string TransactionCode);

public static class PaymentServiceSeedHelper
{
    public static async Task<PaymentServiceSeed> SeedAsync(MovieBookingContext db)
    {
        var now = DateTime.Now;
        var providerTransactionId = DateTime.UtcNow.Ticks;
        var transactionCode = $"PAY-{Guid.NewGuid():N}";

        var user = new User
        {
            FullName = "Test Customer",
            Email = $"customer-{Guid.NewGuid():N}@test.local",
            PasswordHash = "test-hash",
            Role = "Customer",
            Status = true,
            CreatedAt = now
        };
        var cinema = new Cinema { Name = "Test Cinema" };
        var movie = new Movie
        {
            Title = "Test Movie",
            Duration = 120,
            Status = "Now Showing",
            CreatedAt = now
        };
        db.AddRange(user, cinema, movie);
        await db.SaveChangesAsync();

        var room = new Room
        {
            CinemaId = cinema.CinemaId,
            RoomName = "Room 1",
            RoomType = "2D",
            TotalSeats = 1
        };
        db.Rooms.Add(room);
        await db.SaveChangesAsync();

        var showtime = new Showtime
        {
            MovieId = movie.MovieId,
            RoomId = room.RoomId,
            ShowDate = DateOnly.FromDateTime(now),
            StartTime = new TimeOnly(20, 0),
            EndTime = new TimeOnly(22, 0),
            Price = 25m,
            Status = "Active",
            VipMultiplier = 1.2m
        };
        var seat = new Seat
        {
            RoomId = room.RoomId,
            SeatRow = "A",
            SeatNumber = 1,
            SeatType = "Normal",
            IsActive = true
        };
        db.AddRange(showtime, seat);
        await db.SaveChangesAsync();

        var showtimeSeat = new ShowtimeSeat
        {
            ShowtimeId = showtime.ShowtimeId,
            SeatId = seat.SeatId,
            Status = "Holding",
            HoldExpiresAt = now.AddHours(1),
            LockedByUserId = user.UserId
        };
        var booking = new Booking
        {
            UserId = user.UserId,
            ShowtimeId = showtime.ShowtimeId,
            BookingDate = now,
            TotalAmount = 25m,
            Status = "Pending"
        };
        db.AddRange(showtimeSeat, booking);
        await db.SaveChangesAsync();

        var bookingDetail = new BookingDetail
        {
            BookingId = booking.BookingId,
            ShowtimeSeatId = showtimeSeat.ShowtimeSeatId,
            Price = 25m
        };
        var payment = new Payment
        {
            BookingId = booking.BookingId,
            Amount = 25m,
            Method = "VnPay",
            TransactionCode = transactionCode,
            PaymentStatus = "Pending"
        };
        db.AddRange(bookingDetail, payment);
        await db.SaveChangesAsync();

        return new PaymentServiceSeed(
            user.UserId,
            cinema.CinemaId,
            room.RoomId,
            movie.MovieId,
            showtime.ShowtimeId,
            seat.SeatId,
            showtimeSeat.ShowtimeSeatId,
            booking.BookingId,
            bookingDetail.BookingDetailId,
            payment.PaymentId,
            providerTransactionId,
            transactionCode);
    }
}
