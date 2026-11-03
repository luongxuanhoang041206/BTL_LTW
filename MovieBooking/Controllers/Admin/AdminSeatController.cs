using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Models;

namespace MovieBooking.Controllers.Admin;

public class AdminSeatController : AdminBaseController
{
    public AdminSeatController(MovieBookingContext context) : base(context) { }

    public class BatchSeatRequest
    {
        public int Rows { get; set; } = 5; // số hàng A-J
        public int Cols { get; set; } = 12; // số ghế mỗi hàng
        public List<string> VipRows { get; set; } = new() { "D", "E" };
    }

    public class UpdateSeatRequest
    {
        public string? SeatType { get; set; }
        public bool? IsActive { get; set; }
    }

    [HttpGet("rooms/{roomId}/seats")]
    public async Task<IActionResult> GetRoomSeats(int roomId)
    {
        var room = await _context.Rooms
            .Include(r => r.Cinema)
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.RoomId == roomId);

        if (room == null) return NotFound(new { message = "Không tìm thấy phòng chiếu." });

        var seats = await _context.Seats
            .Where(s => s.RoomId == roomId)
            .OrderBy(s => s.SeatRow)
            .ThenBy(s => s.SeatNumber)
            .Select(s => new
            {
                id = s.SeatId,
                row = s.SeatRow,
                number = s.SeatNumber,
                type = s.SeatType,
                isActive = s.IsActive
            })
            .ToListAsync();

        return Ok(new
        {
            roomId = room.RoomId,
            roomName = room.RoomName,
            roomType = room.RoomType,
            cinemaName = room.Cinema.Name,
            seats
        });
    }

    [HttpPost("rooms/{roomId}/seats/batch-generate")]
    public async Task<IActionResult> BatchGenerateSeats(int roomId, [FromBody] BatchSeatRequest request)
    {
        var room = await _context.Rooms.Include(r => r.Seats).FirstOrDefaultAsync(r => r.RoomId == roomId);
        if (room == null) return NotFound(new { message = "Không tìm thấy phòng chiếu." });

        // Kiểm tra xem đã có suất chiếu nào chưa
        var hasShowtimes = await _context.Showtimes.AnyAsync(s => s.RoomId == roomId);
        if (hasShowtimes)
        {
            return BadRequest(new { message = "Phòng chiếu đã được xếp suất chiếu, không thể khởi tạo lại toàn bộ sơ đồ ghế." });
        }

        _context.Seats.RemoveRange(room.Seats);

        var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        int rowsCount = Math.Clamp(request.Rows, 1, 15);
        int colsCount = Math.Clamp(request.Cols, 1, 20);

        var newSeats = new List<Seat>();
        for (int i = 0; i < rowsCount; i++)
        {
            var rowName = letters[i].ToString();
            for (int num = 1; num <= colsCount; num++)
            {
                var isVip = request.VipRows.Contains(rowName);
                newSeats.Add(new Seat
                {
                    RoomId = roomId,
                    SeatRow = rowName,
                    SeatNumber = num,
                    SeatType = isVip ? "VIP" : "Normal",
                    IsActive = true
                });
            }
        }

        _context.Seats.AddRange(newSeats);
        room.TotalSeats = newSeats.Count;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = $"Đã tạo sơ đồ gồm {newSeats.Count} ghế cho phòng {room.RoomName}!" });
    }

    [HttpPatch("seats/{seatId}/toggle")]
    public async Task<IActionResult> ToggleSeatStatus(int seatId)
    {
        var seat = await _context.Seats.FindAsync(seatId);
        if (seat == null) return NotFound(new { message = "Không tìm thấy ghế." });

        seat.IsActive = !seat.IsActive;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, seatId = seat.SeatId, isActive = seat.IsActive });
    }

    [HttpPatch("seats/{seatId}/type")]
    public async Task<IActionResult> ChangeSeatType(int seatId, [FromBody] UpdateSeatRequest request)
    {
        var seat = await _context.Seats.FindAsync(seatId);
        if (seat == null) return NotFound(new { message = "Không tìm thấy ghế." });

        if (!string.IsNullOrWhiteSpace(request.SeatType))
        {
            seat.SeatType = request.SeatType.Trim();
        }
        if (request.IsActive.HasValue)
        {
            seat.IsActive = request.IsActive.Value;
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, seatId = seat.SeatId, seatType = seat.SeatType, isActive = seat.IsActive });
    }
}
