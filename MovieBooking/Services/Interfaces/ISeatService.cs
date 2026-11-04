using MovieBooking.DTOs;

namespace MovieBooking.Services.Interfaces;

public interface ISeatService
{
    Task<RoomSeatMapDto?> GetRoomSeatsAsync(int roomId);
    Task<SeatGenerationResult> GenerateSeatsAsync(int roomId, BatchSeatRequestDto request);
    Task<SeatStateDto?> ToggleSeatStatusAsync(int seatId);
    Task<UpdatedSeatDto?> UpdateSeatAsync(int seatId, UpdateSeatRequestDto request);
}
