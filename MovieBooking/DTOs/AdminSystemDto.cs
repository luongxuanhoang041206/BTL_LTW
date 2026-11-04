namespace MovieBooking.DTOs;

public sealed class StaffUserFormDto
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Password { get; set; }
    public string? Phone { get; set; }
    public string Role { get; set; } = "Staff";
    public bool Status { get; set; } = true;
}

public sealed class SystemSettingsDto
{
    public string BrandName { get; set; } = "RoPhim Cinema";
    public int SeatHoldMinutes { get; set; } = 10;
    public decimal DefaultTicketPrice { get; set; } = 75000;
    public decimal VipPriceMultiplier { get; set; } = 1.2m;
    public string CustomerSupportEmail { get; set; } = "support@moviebooking.com";
    public string CustomerSupportPhone { get; set; } = "1900 1234";
    public bool AllowOnlineCancellation { get; set; } = true;
    public bool MaintenanceMode { get; set; }
}

public sealed record AdminStaffUserDto(int Id, string FullName, string Email, string Phone, string Role, bool Status, string CreatedAt);
public sealed record SystemRoleDto(string RoleName, string Description, int UserCount, string[] Permissions);
public sealed record SystemAuditLogDto(string Action, string PerformedBy, string Target, string Timestamp, string Status, string Details);
