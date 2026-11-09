using Microsoft.EntityFrameworkCore;
using Moq;
using MovieBooking.Models;
using MovieBooking.Services;
using MovieBooking.Services.Interfaces;
using MovieBooking.Tests.Helpers;

namespace MovieBooking.Tests.ServiceTests;

public class ShowtimeServiceTests
{
    // 1. Suất trùng phòng bị chặn, còn cùng giờ ở phòng khác được tạo.
    [Fact]
    public async Task CreateShowtimeAsync_OverlappingTimeRejectsSameRoomAndAllowsOtherRoom()
    {
        using var testDb = new SqliteTestDatabase();
        var seed = await PaymentServiceSeedHelper.SeedAsync(testDb.Context);
        var movie = await testDb.Context.Movies.SingleAsync(x => x.MovieId == seed.MovieId);
        movie.Status = "Showing";
        movie.Duration = 105;
        var existingShowtime = await testDb.Context.Showtimes
            .SingleAsync(x => x.ShowtimeId == seed.ShowtimeId);
        existingShowtime.StartTime = new TimeOnly(18, 0);
        existingShowtime.EndTime = new TimeOnly(20, 0);

        var otherRoom = new Room
        {
            CinemaId = seed.CinemaId,
            RoomName = "Room 2",
            RoomType = "2D",
            TotalSeats = 1
        };
        testDb.Context.Rooms.Add(otherRoom);
        await testDb.Context.SaveChangesAsync();
        testDb.Context.Seats.Add(new Seat
        {
            RoomId = otherRoom.RoomId,
            SeatRow = "A",
            SeatNumber = 1,
            SeatType = "Normal",
            IsActive = true
        });
        await testDb.Context.SaveChangesAsync();

        var service = new ShowtimeService(testDb.Context, new Mock<ISystemSettingsService>().Object);
        var date = DateOnly.FromDateTime(DateTime.Today).ToString("yyyy-MM-dd");
        var originalCount = await testDb.Context.Showtimes.CountAsync();

        var overlap = await service.CreateShowtimeAsync(
            seed.MovieId, seed.RoomId, date, "19:00", 25m, 1.2m);
        Assert.False(overlap.Success);
        Assert.Contains("trùng", overlap.Error ?? string.Empty, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(originalCount, await testDb.Context.Showtimes.CountAsync());

        var otherRoomResult = await service.CreateShowtimeAsync(
            seed.MovieId, otherRoom.RoomId, date, "19:00", 25m, 1.2m);
        Assert.True(otherRoomResult.Success);
        Assert.NotNull(otherRoomResult.ShowtimeId);
        Assert.Equal(originalCount + 1, await testDb.Context.Showtimes.CountAsync());
    }
}
