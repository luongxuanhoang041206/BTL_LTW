using System.Threading.Tasks;
using MovieBooking.DTOs;
using MovieBooking.Models;

namespace MovieBooking.Services.Interfaces;

public interface IAuthService
{
    /// <summary>
    /// Xác thực thông tin đăng nhập của người dùng.
    /// </summary>
    /// <param name="email">Email đăng nhập</param>
    /// <param name="password">Mật khẩu thô</param>
    /// <returns>Tuple chứa kết quả thành công, thông báo lỗi nếu có, và đối tượng User nếu hợp lệ</returns>
    Task<(bool Success, string? ErrorMessage, User? User)> LoginAsync(string email, string password);

    /// <summary>
    /// Đăng ký tài khoản mới vào hệ thống.
    /// </summary>
    /// <param name="model">Thông tin đăng ký</param>
    /// <returns>Tuple chứa kết quả thành công và thông báo lỗi nếu có</returns>
    Task<(bool Success, string? ErrorMessage)> RegisterAsync(RegisterViewModel model);
}
