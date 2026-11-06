using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.DTOs;
using MovieBooking.Models;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Services;

public sealed class RoomService(MovieBookingContext context) : IRoomService
{
    public async Task<List<AdminRoomDto>> GetRoomsAsync(int? cinemaId)
    {
        var query = context.Rooms.AsNoTracking().AsQueryable();
        if (cinemaId.HasValue && cinemaId.Value > 0)
            query = query.Where(room => room.CinemaId == cinemaId.Value);

        return await query
            .OrderBy(room => room.Cinema.Name)
            .ThenBy(room => room.RoomName)
            .Select(room => new AdminRoomDto(
                room.RoomId,
                room.CinemaId,
                room.Cinema.Name,
                room.RoomName,
                room.RoomType,
                room.Seats.Count > 0 ? room.Seats.Count : room.TotalSeats,
                room.Seats.Count(seat => seat.IsActive),
                room.Showtimes.Count(showtime => showtime.Status == "Active")))
            .ToListAsync();
    }

    public async Task<(int? Id, string? Error)> CreateRoomAsync(RoomFormDto request)
    {
        if (string.IsNullOrWhiteSpace(request.RoomName)) return (null, "EmptyRoomName");
        if (await context.Cinemas.FindAsync(request.CinemaId) == null) return (null, "CinemaNotFound");

        var room = new Room
        {
            CinemaId = request.CinemaId,
            RoomName = request.RoomName.Trim(),
            RoomType = string.IsNullOrWhiteSpace(request.RoomType) ? "2D" : request.RoomType.Trim(),
            TotalSeats = request.TotalSeats > 0 ? request.TotalSeats : 60
        };
        context.Rooms.Add(room);
        await context.SaveChangesAsync();

        if (request.AutoGenerateSeats)
        {
            string[] rows = { "A", "B", "C", "D", "E" };
            int seatsPerRow = Math.Max(6, room.TotalSeats / rows.Length);
            var seats = new List<Seat>();
            foreach (var row in rows)
                for (int number = 1; number <= seatsPerRow; number++)
                    seats.Add(new Seat
                    {
                        RoomId = room.RoomId,
                        SeatRow = row,
                        SeatNumber = number,
                        SeatType = row is "D" or "E" ? "VIP" : "Normal",
                        IsActive = true
                    });

            context.Seats.AddRange(seats);
            room.TotalSeats = seats.Count;
            await context.SaveChangesAsync();
        }

        return (room.RoomId, null);
    }

    public async Task<string?> UpdateRoomAsync(int id, RoomFormDto request)
    {
        var room = await context.Rooms.FindAsync(id);
        if (room == null) return "NotFound";
        if (string.IsNullOrWhiteSpace(request.RoomName)) return "EmptyRoomName";

        room.RoomName = request.RoomName.Trim();
        room.RoomType = string.IsNullOrWhiteSpace(request.RoomType) ? "2D" : request.RoomType.Trim();
        if (request.CinemaId > 0) room.CinemaId = request.CinemaId;
        await context.SaveChangesAsync();
        return null;
    }

    public async Task<string?> DeleteRoomAsync(int id)
    {
        var room = await context.Rooms
            .Include(item => item.Showtimes)
            .Include(item => item.Seats)
            .FirstOrDefaultAsync(item => item.RoomId == id);
        if (room == null) return "NotFound";
        if (room.Showtimes.Any(showtime => showtime.Status == "Active")) return "ActiveShowtimes";

        context.Seats.RemoveRange(room.Seats);
        context.Rooms.Remove(room);
        await context.SaveChangesAsync();
        return null;
    }
}
