using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.DTOs;
using MovieBooking.Models;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Services;

public sealed class AdminSystemService(MovieBookingContext context) : IAdminSystemService
{
    private static SystemSettingsDto _settings = new();

    public async Task<List<AdminStaffUserDto>> GetStaffUsersAsync() => await context.Users
        .Where(user => user.Role == "Admin" || user.Role == "Staff")
        .AsNoTracking()
        .OrderByDescending(user => user.CreatedAt)
        .Select(user => new AdminStaffUserDto(user.UserId, user.FullName, user.Email, user.Phone ?? "",
            user.Role, user.Status, user.CreatedAt.ToString("yyyy-MM-dd")))
        .ToListAsync();

    public async Task<(int? Id, string? Error)> CreateStaffUserAsync(StaffUserFormDto request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.Email))
            return (null, "NameOrEmailRequired");
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
            return (null, "PasswordTooShort");
        var email = request.Email.Trim().ToLower();
        if (await context.Users.AnyAsync(user => user.Email.ToLower() == email)) return (null, "EmailExists");

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
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return (user.UserId, null);
    }

    public async Task<bool> UpdateStaffUserAsync(int id, StaffUserFormDto request)
    {
        var user = await context.Users.FindAsync(id);
        if (user == null) return false;
        user.FullName = request.FullName.Trim();
        user.Phone = request.Phone?.Trim();
        user.Role = request.Role == "Admin" ? "Admin" : "Staff";
        user.Status = request.Status;
        if (!string.IsNullOrWhiteSpace(request.Password))
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        await context.SaveChangesAsync();
        return true;
    }

    public async Task<List<SystemRoleDto>> GetSystemRolesAsync()
    {
        var counts = await context.Users.GroupBy(user => user.Role)
            .Select(group => new { Role = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.Role, item => item.Count);
        return new List<SystemRoleDto>
        {
            new("Admin", "Toàn quyền quản trị hệ thống, dữ liệu phim, rạp, tài chính và phân quyền.",
                counts.GetValueOrDefault("Admin"), new[] { "Quản lý danh sách phim & thể loại", "Quản lý hệ thống rạp & sơ đồ ghế", "Quản lý lịch chiếu & đặt vé", "Xem và xử lý thanh toán & khuyến mãi", "Xem báo cáo doanh thu & hiệu suất", "Quản lý tài khoản quản trị & cài đặt hệ thống" }),
            new("Staff", "Nhân viên vận hành bán vé, kiểm tra lịch chiếu và hỗ trợ khách hàng.",
                counts.GetValueOrDefault("Staff"), new[] { "Xem danh sách phim và lịch chiếu", "Xem và tìm kiếm đơn đặt vé", "Hỗ trợ xác nhận vé khách hàng", "Xem sơ đồ ghế" }),
            new("Customer", "Khách hàng đăng ký tài khoản trực tuyến trên ứng dụng RoPhim.",
                counts.GetValueOrDefault("Customer"), new[] { "Xem thông tin phim và lịch chiếu", "Đặt vé & chọn ghế trực tuyến", "Thanh toán đơn hàng", "Viết đánh giá & bình luận phim" })
        };
    }

    public async Task<List<SystemAuditLogDto>> GetAuditLogsAsync()
    {
        var bookings = await context.Bookings
            .OrderByDescending(booking => booking.BookingDate).Take(15)
            .Select(booking => new SystemAuditLogDto(
                booking.Status == "Confirmed" ? "Xác nhận đặt vé" : "Tạo đơn đặt vé",
                booking.User.FullName,
                "Mã vé MB-" + booking.BookingId.ToString("D6"),
                booking.BookingDate.ToString("yyyy-MM-dd HH:mm:ss"),
                "Success",
                $"Đơn hàng tổng giá trị {booking.TotalAmount:N0} đ, trạng thái: {booking.Status}"))
            .ToListAsync();
        var payments = await context.Payments
            .Where(payment => payment.PaidAt.HasValue)
            .OrderByDescending(payment => payment.PaidAt).Take(10)
            .Select(payment => new SystemAuditLogDto(
                "Thanh toán giao dịch",
                "Hệ thống / " + payment.Method,
                "Payment #" + payment.PaymentId,
                (payment.PaidAt ?? DateTime.Now).ToString("yyyy-MM-dd HH:mm:ss"),
                payment.PaymentStatus == "Completed" ? "Success" : "Pending",
                $"Số tiền {payment.Amount:N0} đ qua {payment.Method}, mã GD: {payment.TransactionCode ?? "N/A"}"))
            .ToListAsync();
        return bookings.Concat(payments).OrderByDescending(log => log.Timestamp).Take(25).ToList();
    }

    public SystemSettingsDto GetSystemSettings() => _settings;

    public SystemSettingsDto UpdateSystemSettings(SystemSettingsDto settings)
    {
        _settings = settings;
        return _settings;
    }
}
