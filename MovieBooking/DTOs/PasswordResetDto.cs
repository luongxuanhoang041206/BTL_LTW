using System.ComponentModel.DataAnnotations;

namespace MovieBooking.DTOs;

public class ForgotPasswordRequest
{
	[Required(ErrorMessage = "Vui lòng nhập Email")]
	[EmailAddress(ErrorMessage = "Email không đúng định dạng")]
	[StringLength(100, ErrorMessage = "Email không vượt quá 100 ký tự")]
	[Display(Name = "Email")]
	public string Email { get; set; } = string.Empty;
}

public class ResetPasswordRequest
{
	[Required(ErrorMessage = "Liên kết không hợp lệ hoặc đã hết hạn.")]
	public string Token { get; set; } = string.Empty;

	[Required(ErrorMessage = "Vui lòng nhập mật khẩu")]
	[StringLength(100, MinimumLength = 6, ErrorMessage = "Mật khẩu phải từ 6 ký tự trở lên")]
	[DataType(DataType.Password)]
	[Display(Name = "Mật khẩu mới")]
	public string NewPassword { get; set; } = string.Empty;

	[Required(ErrorMessage = "Vui lòng xác nhận mật khẩu")]
	[DataType(DataType.Password)]
	[Display(Name = "Xác nhận mật khẩu")]
	[Compare("NewPassword", ErrorMessage = "Mật khẩu và xác nhận mật khẩu không khớp")]
	public string ConfirmPassword { get; set; } = string.Empty;
}