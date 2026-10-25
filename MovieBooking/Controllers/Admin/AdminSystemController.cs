using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.Models;

namespace MovieBooking.Controllers.Admin;

public class AdminSystemController : AdminBaseController
{
    public AdminSystemController(MovieBookingContext context) : base(context) { }

    public class StaffUserRequest
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Password { get; set; }
        public string? Phone { get; set; }
        public string Role { get; set; } = "Staff";
        public bool Status { get; set; } = true;
    }

    public class SystemSettingsDto
    {
        public string BrandName { get; set; } = "RoPhim Cinema";
        public int SeatHoldMinutes { get; set; } = 10;
        public decimal DefaultTicketPrice { get; set; } = 75000;
        public decimal VipPriceMultiplier { get; set; } = 1.2m;
        public string CustomerSupportEmail { get; set; } = "support@moviebooking.com";
        public string CustomerSupportPhone { get; set; } = "1900 1234";
        public bool AllowOnlineCancellation { get; set; } = true;
        public bool MaintenanceMode { get; set; } = false;
    }

    // Bộ nhớ đệm cấu hình hệ thống
    private static SystemSettingsDto _systemSettings = new()
    {
        BrandName = "RoPhim Cinema",
        SeatHoldMinutes = 10,
        DefaultTicketPrice = 75000,
        VipPriceMultiplier = 1.2m,
        CustomerSupportEmail = "support@moviebooking.com",
        CustomerSupportPhone = "1900 1234",
        AllowOnlineCancellation = true,
        MaintenanceMode = false
    };

    [HttpGet("system/users")]
    public async Task<IActionResult> GetStaffUsers()
    {
        var staff = await _context.Users
            .Where(u => u.Role == "Admin" || u.Role == "Staff")
            .AsNoTracking()
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new
            {
                id = u.UserId,
                fullName = u.FullName,
                email = u.Email,
                phone = u.Phone ?? "",
                role = u.Role,
                status = u.Status,
                createdAt = u.CreatedAt.ToString("yyyy-MM-dd")
            })
            .ToListAsync();

        return Ok(staff);
    }

    [HttpPost("system/users")]
    public async Task<IActionResult> CreateStaffUser([FromBody] StaffUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "Họ tên và Email không được để trống." });

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
            return BadRequest(new { message = "Mật khẩu phải có ít nhất 6 ký tự." });

        var email = request.Email.Trim().ToLower();
        if (await _context.Users.AnyAsync(u => u.Email.ToLower() == email))
            return Conflict(new { message = "Email này đã được sử dụng." });

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Phone = request.Phone?.Trim(),
            Role = request.Role == "Admin" ? "Admin" : "Staff",
            Status = request.Status,
            CreatedAt = DateTime.Now
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Tạo tài khoản quản trị thành công!", id = user.UserId });
    }

    [HttpPut("system/users/{id}")]
    public async Task<IActionResult> UpdateStaffUser(int id, [FromBody] StaffUserRequest request)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "Không tìm thấy người dùng." });

        user.FullName = request.FullName.Trim();
        user.Phone = request.Phone?.Trim();
        user.Role = request.Role == "Admin" ? "Admin" : "Staff";
        user.Status = request.Status;

        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Cập nhật tài khoản thành công!" });
    }

    [HttpGet("system/roles")]
    public IActionResult GetSystemRoles()
    {
        var roles = new[]
        {
            new
            {
                roleName = "Admin",
                description = "Toàn quyền quản trị hệ thống, dữ liệu phim, rạp, tài chính và phân quyền.",
                userCount = _context.Users.Count(u => u.Role == "Admin"),
                permissions = new[]
                {
                    "Quản lý danh sách phim & thể loại",
                    "Quản lý hệ thống rạp & sơ đồ ghế",
                    "Quản lý lịch chiếu & đặt vé",
                    "Xem và xử lý thanh toán & khuyến mãi",
                    "Xem báo cáo doanh thu & hiệu suất",
                    "Quản lý tài khoản quản trị & cài đặt hệ thống"
                }
            },
            new
            {
                roleName = "Staff",
                description = "Nhân viên vận hành bán vé, kiểm tra lịch chiếu và hỗ trợ khách hàng.",
                userCount = _context.Users.Count(u => u.Role == "Staff"),
                permissions = new[]
                {
                    "Xem danh sách phim và lịch chiếu",
                    "Xem và tìm kiếm đơn đặt vé",
                    "Hỗ trợ xác nhận vé khách hàng",
                    "Xem sơ đồ ghế"
                }
            },
            new
            {
                roleName = "Customer",
                description = "Khách hàng đăng ký tài khoản trực tuyến trên ứng dụng RoPhim.",
                userCount = _context.Users.Count(u => u.Role == "Customer"),
                permissions = new[]
                {
                    "Xem thông tin phim và lịch chiếu",
                    "Đặt vé & chọn ghế trực tuyến",
                    "Thanh toán đơn hàng",
                    "Viết đánh giá & bình luận phim"
                }
            }
        };

        return Ok(roles);
    }

    [HttpGet("system/audit-logs")]
    public async Task<IActionResult> GetAuditLogs()
    {
        // Tạo log nhật ký từ các sự kiện gần nhất trong cơ sở dữ liệu (Giao dịch, đơn đặt vé, lịch chiếu)
        var recentBookings = await _context.Bookings
            .Include(b => b.User)
            .OrderByDescending(b => b.BookingDate)
            .Take(15)
            .Select(b => new
            {
                action = b.Status == "Confirmed" ? "Xác nhận đặt vé" : "Tạo đơn đặt vé",
                performedBy = b.User.FullName,
                target = "Mã vé MB-" + b.BookingId.ToString("D6"),
                timestamp = b.BookingDate.ToString("yyyy-MM-dd HH:mm:ss"),
                status = "Success",
                details = $"Đơn hàng tổng giá trị {b.TotalAmount:N0} đ, trạng thái: {b.Status}"
            })
            .ToListAsync();

        var recentPayments = await _context.Payments
            .Where(p => p.PaidAt.HasValue)
            .OrderByDescending(p => p.PaidAt)
            .Take(10)
            .Select(p => new
            {
                action = "Thanh toán giao dịch",
                performedBy = "Hệ thống / " + p.Method,
                target = "Payment #" + p.PaymentId,
                timestamp = (p.PaidAt ?? DateTime.Now).ToString("yyyy-MM-dd HH:mm:ss"),
                status = p.PaymentStatus == "Completed" ? "Success" : "Pending",
                details = $"Số tiền {p.Amount:N0} đ qua {p.Method}, mã GD: {p.TransactionCode ?? "N/A"}"
            })
            .ToListAsync();

        var logs = recentBookings.Concat(recentPayments)
            .OrderByDescending(x => x.timestamp)
            .Take(25);

        return Ok(logs);
    }

    [HttpGet("system/settings")]
    public IActionResult GetSystemSettings()
    {
        return Ok(_systemSettings);
    }

    [HttpPost("system/settings")]
    public IActionResult UpdateSystemSettings([FromBody] SystemSettingsDto settings)
    {
        if (settings == null) return BadRequest();
        _systemSettings = settings;
        return Ok(new { success = true, message = "Đã lưu cấu hình hệ thống thành công!", settings = _systemSettings });
    }
}
