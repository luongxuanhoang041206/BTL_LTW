using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Models;

namespace MovieBooking.Controllers.Admin;

public class AdminRoomController : AdminBaseController
{
    public AdminRoomController(MovieBookingContext context) : base(context) { }

    public class RoomRequest
    {
        public int CinemaId { get; set; }
        public string RoomName { get; set; } = string.Empty;
        public string RoomType { get; set; } = "2D";
        public int TotalSeats { get; set; } = 60;
        public bool AutoGenerateSeats { get; set; } = true;
    }

    [HttpGet("rooms")]
    public async Task<IActionResult> GetRooms([FromQuery] int? cinemaId)
    {
        var query = _context.Rooms
            .Include(r => r.Cinema)
            .Include(r => r.Seats)
            .AsNoTracking();

        if (cinemaId.HasValue && cinemaId.Value > 0)
        {
            query = query.Where(r => r.CinemaId == cinemaId.Value);
        }

        var rooms = await query
            .OrderBy(r => r.Cinema.Name)
            .ThenBy(r => r.RoomName)
            .Select(r => new
            {
                id = r.RoomId,
                cinemaId = r.CinemaId,
                cinemaName = r.Cinema.Name,
                roomName = r.RoomName,
                roomType = r.RoomType,
                totalSeats = r.Seats.Count > 0 ? r.Seats.Count : r.TotalSeats,
                activeSeats = r.Seats.Count(s => s.IsActive),
                showtimesCount = r.Showtimes.Count(s => s.Status == "Active")
            })
            .ToListAsync();

        return Ok(rooms);
    }

    [HttpPost("rooms")]
    public async Task<IActionResult> CreateRoom([FromBody] RoomRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RoomName))
            return BadRequest(new { message = "Tên phòng chiếu không được để trống." });

        var cinema = await _context.Cinemas.FindAsync(request.CinemaId);
        if (cinema == null) return BadRequest(new { message = "Không tìm thấy rạp tương ứng." });

        var room = new Room
        {
            CinemaId = request.CinemaId,
            RoomName = request.RoomName.Trim(),
            RoomType = string.IsNullOrWhiteSpace(request.RoomType) ? "2D" : request.RoomType.Trim(),
            TotalSeats = request.TotalSeats > 0 ? request.TotalSeats : 60
        };

        _context.Rooms.Add(room);
        await _context.SaveChangesAsync();

        if (request.AutoGenerateSeats)
        {
            // Tự động sinh hàng ghế A-E, mỗi hàng 12 ghế = 60 ghế chuẩn
            string[] rows = { "A", "B", "C", "D", "E" };
            int seatsPerRow = Math.Max(6, room.TotalSeats / rows.Length);
            var seats = new List<Seat>();
            foreach (var r in rows)
            {
                for (int num = 1; num <= seatsPerRow; num++)
                {
                    seats.Add(new Seat
                    {
                        RoomId = room.RoomId,
                        SeatRow = r,
                        SeatNumber = num,
                        SeatType = (r == "D" || r == "E") ? "VIP" : "Normal",
                        IsActive = true
                    });
                }
            }
            _context.Seats.AddRange(seats);
            room.TotalSeats = seats.Count;
            await _context.SaveChangesAsync();
        }

        return Ok(new { success = true, message = "Thêm phòng chiếu thành công!", id = room.RoomId });
    }

    [HttpPut("rooms/{id}")]
    public async Task<IActionResult> UpdateRoom(int id, [FromBody] RoomRequest request)
    {
        var room = await _context.Rooms.FindAsync(id);
        if (room == null) return NotFound(new { message = "Không tìm thấy phòng chiếu." });

        if (string.IsNullOrWhiteSpace(request.RoomName))
            return BadRequest(new { message = "Tên phòng không được để trống." });

        room.RoomName = request.RoomName.Trim();
        room.RoomType = string.IsNullOrWhiteSpace(request.RoomType) ? "2D" : request.RoomType.Trim();
        if (request.CinemaId > 0) room.CinemaId = request.CinemaId;

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Cập nhật phòng chiếu thành công!" });
    }

    [HttpDelete("rooms/{id}")]
    public async Task<IActionResult> DeleteRoom(int id)
    {
        var room = await _context.Rooms
            .Include(r => r.Showtimes)
            .Include(r => r.Seats)
            .FirstOrDefaultAsync(r => r.RoomId == id);

        if (room == null) return NotFound(new { message = "Không tìm thấy phòng chiếu." });

        if (room.Showtimes.Any(s => s.Status == "Active"))
            return BadRequest(new { message = "Không thể xóa phòng chiếu đang có suất chiếu hoạt động." });

        _context.Seats.RemoveRange(room.Seats);
        _context.Rooms.Remove(room);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Xóa phòng chiếu thành công!" });
    }
}
