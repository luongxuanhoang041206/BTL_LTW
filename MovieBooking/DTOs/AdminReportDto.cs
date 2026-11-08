using System.ComponentModel.DataAnnotations;
using System.Globalization;
using MovieBooking.Services;

namespace MovieBooking.DTOs;

public sealed record AdminDashboardDto(int TotalBookings, decimal TotalRevenue, int ActiveShowsCount,
    int TotalUsers, List<RecentShowDto> RecentShows);
public sealed record RecentShowDto(int ShowtimeId, string MovieTitle, string ShowDate, string StartTime, decimal Price);
public sealed record DailyRevenueDto(string Date, decimal Revenue);
public sealed record TopMovieRevenueDto(string MovieTitle, decimal Revenue, int BookingsCount);
public sealed record CinemaRevenueDto(string CinemaName, decimal Revenue);

/// <summary>Date là yyyy-MM-dd của bucket (ngày, hoặc ngày đầu tháng với quarter/year).</summary>
public sealed record RevenueTrendItemDto(string Date, string Label, decimal Revenue);

public sealed record AdminRevenueAnalyticsDto(string Period, string StartDate, string EndDate,
    decimal TotalRevenue, int TotalConfirmedBookings, decimal AvgTicketValue,
    List<RevenueTrendItemDto> RevenueTrend, List<TopMovieRevenueDto> TopMovies,
    List<CinemaRevenueDto> CinemaRevenue, List<DailyRevenueDto> DailyRevenue);

public sealed class RevenueReportQueryDto : IValidatableObject
{
    [RegularExpression("^(?i)(week|month|quarter|year)$",
        ErrorMessage = "period chỉ chấp nhận week, month, quarter hoặc year.")]
    public string? Period { get; set; }

    // Cận trên 9998 để mốc kết thúc loại trừ (01/01 năm sau) vẫn nằm trong kiểu datetime của SQL Server.
    [Range(1753, 9998, ErrorMessage = "year phải nằm trong khoảng 1753-9998.")]
    public int? Year { get; set; }

    [Range(1, 12, ErrorMessage = "month phải nằm trong khoảng 1-12.")]
    public int? Month { get; set; }

    [Range(1, 4, ErrorMessage = "quarter phải nằm trong khoảng 1-4.")]
    public int? Quarter { get; set; }

    /// <summary>Chỉ dùng khi period=week. Không truyền thì báo cáo tuần hiện tại (giờ Việt Nam).</summary>
    public string? WeekStart { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(WeekStart)) yield break;

        var member = new[] { nameof(WeekStart) };
        if (!DateOnly.TryParseExact(WeekStart.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var monday))
        {
            yield return new ValidationResult("weekStart phải có định dạng yyyy-MM-dd.", member);
            yield break;
        }

        if (monday.Year is < 1753 or > 9998)
            yield return new ValidationResult("weekStart phải nằm trong khoảng năm 1753-9998.", member);
        else if (monday.DayOfWeek != DayOfWeek.Monday)
            yield return new ValidationResult("weekStart phải là ngày thứ Hai.", member);
        else
        {
            var currentMonday = VietnamTime.MondayOf(VietnamTime.Today);
            if (monday > currentMonday)
                yield return new ValidationResult(
                    $"weekStart không được vượt quá tuần hiện tại ({currentMonday.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)}).",
                    member);
        }
    }
}