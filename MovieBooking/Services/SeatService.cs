using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.DTOs;
using MovieBooking.Models;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Services;

public sealed class SeatService(MovieBookingContext context) : ISeatService
{
    public async Task<RoomSeatMapDto?> GetRoomSeatsAsync(int roomId)
    {
        var room = await context.Rooms
            .AsNoTracking()
            .Where(item => item.RoomId == roomId)
            .Select(item => new { item.RoomId, item.RoomName, item.RoomType, CinemaName = item.Cinema.Name })
            .FirstOrDefaultAsync();
        if (room == null) return null;

        var seats = await context.Seats
            .AsNoTracking()
            .Where(seat => seat.RoomId == roomId)
            .OrderBy(seat => seat.SeatRow)
            .ThenBy(seat => seat.SeatNumber)
            .Select(seat => new SeatItemDto(seat.SeatId, seat.SeatRow, seat.SeatNumber, seat.SeatType, seat.IsActive))
            .ToListAsync();
        return new RoomSeatMapDto(room.RoomId, room.RoomName, room.RoomType, room.CinemaName, seats);
    }

    public async Task<SeatGenerationResult> GenerateSeatsAsync(int roomId, BatchSeatRequestDto request)
    {
        var room = await context.Rooms.Include(item => item.Seats).FirstOrDefaultAsync(item => item.RoomId == roomId);
        if (room == null) return new SeatGenerationResult("NotFound", 0, null);
        if (await context.Showtimes.AnyAsync(showtime => showtime.RoomId == roomId))
            return new SeatGenerationResult("HasShowtimes", 0, room.RoomName);

        context.Seats.RemoveRange(room.Seats);
        const string letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        int rowsCount = Math.Clamp(request.Rows, 1, 15);
        int colsCount = Math.Clamp(request.Cols, 1, 20);
        var newSeats = new List<Seat>();
        for (int index = 0; index < rowsCount; index++)
        {
            var rowName = letters[index].ToString();
            for (int number = 1; number <= colsCount; number++)
                newSeats.Add(new Seat
                {
                    RoomId = roomId,
                    SeatRow = rowName,
                    SeatNumber = number,
                    SeatType = request.VipRows.Contains(rowName) ? "VIP" : "Normal",
                    IsActive = true
                });
        }

        context.Seats.AddRange(newSeats);
        room.TotalSeats = newSeats.Count;
        await context.SaveChangesAsync();
        return new SeatGenerationResult(null, newSeats.Count, room.RoomName);
    }

    public async Task<SeatStateDto?> ToggleSeatStatusAsync(int seatId)
    {
        var seat = await context.Seats.FindAsync(seatId);
        if (seat == null) return null;
        seat.IsActive = !seat.IsActive;
        await context.SaveChangesAsync();
        return new SeatStateDto(seat.SeatId, seat.IsActive);
    }

    public async Task<UpdatedSeatDto?> UpdateSeatAsync(int seatId, UpdateSeatRequestDto request)
    {
        var seat = await context.Seats.FindAsync(seatId);
        if (seat == null) return null;
        if (!string.IsNullOrWhiteSpace(request.SeatType)) seat.SeatType = request.SeatType.Trim();
        if (request.IsActive.HasValue) seat.IsActive = request.IsActive.Value;
        await context.SaveChangesAsync();
        return new UpdatedSeatDto(seat.SeatId, seat.SeatType, seat.IsActive);
    }
}
