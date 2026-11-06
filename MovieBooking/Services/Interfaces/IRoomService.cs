using MovieBooking.DTOs;

namespace MovieBooking.Services.Interfaces;

public interface IRoomService
{
    Task<List<AdminRoomDto>> GetRoomsAsync(int? cinemaId);
    Task<(int? Id, string? Error)> CreateRoomAsync(RoomFormDto request);
    Task<string?> UpdateRoomAsync(int id, RoomFormDto request);
    Task<string?> DeleteRoomAsync(int id);
}
