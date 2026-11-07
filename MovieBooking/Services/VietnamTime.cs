namespace MovieBooking.Services;

/// <summary>Mốc giờ dùng chung cho báo cáo: giờ Việt Nam (UTC+7), tuần bắt đầu từ thứ Hai.</summary>
internal static class VietnamTime
{
    private static readonly TimeZoneInfo Zone =
        TimeZoneInfo.TryFindSystemTimeZoneById("Asia/Ho_Chi_Minh", out var vietnam)
            ? vietnam
            : TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");

    public static DateOnly Today => DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Zone));

    public static DateOnly MondayOf(DateOnly day) => day.AddDays(-((int)day.DayOfWeek + 6) % 7);
}