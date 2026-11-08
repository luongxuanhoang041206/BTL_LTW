using System.Globalization;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.DTOs;
using MovieBooking.Models;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Services;

public sealed class AdminReportingService(MovieBookingContext context) : IAdminReportingService
{
    public async Task<AdminDashboardDto> GetDashboardAsync()
    {
        var totalBookings = await context.Bookings.CountAsync();
        var totalRevenue = await context.Bookings.Where(booking => booking.Status == "Paid")
            .SumAsync(booking => (decimal?)booking.TotalAmount) ?? 0;
        var activeShowsCount = await context.Showtimes.CountAsync(showtime => showtime.Status == "Active");
        var totalUsers = await context.Users.CountAsync();
        var recentShows = await context.Showtimes
            .Where(showtime => showtime.Status == "Active")
            .OrderByDescending(showtime => showtime.ShowDate)
            .Take(5)
            .Select(showtime => new RecentShowDto(showtime.ShowtimeId, showtime.Movie.Title,
                showtime.ShowDate.ToString("yyyy-MM-dd"), showtime.StartTime.ToString("HH:mm"), showtime.Price))
            .ToListAsync();
        return new AdminDashboardDto(totalBookings, totalRevenue, activeShowsCount, totalUsers, recentShows);
    }

    public async Task<AdminRevenueAnalyticsDto> GetRevenueAnalyticsAsync(RevenueReportQueryDto query)
    {
        var (period, startDate, endDate) = ResolveRange(query);

        // BookingDate được ghi bằng giờ local Việt Nam (DateTime.Now / getdate()), nên so sánh trực tiếp
        // với biên [start, end) dạng wall-clock là nhất quán và vẫn dùng được index trên Bookings.
        // Mọi phép tính đều chạy trong SQL qua một booking duy nhất, nên nhiều payment không nhân đôi doanh thu.
        var paidBookings = context.Bookings
            .AsNoTracking()
            .Where(booking => booking.Status == "Paid"
                && booking.BookingDate >= startDate
                && booking.BookingDate < endDate
                && booking.Payments.Any(payment =>
                    payment.PaymentStatus == "Success" || payment.PaymentStatus == "Completed"));

        var summary = await paidBookings
            .GroupBy(booking => 1)
            .Select(group => new
            {
                Revenue = group.Sum(booking => (decimal?)booking.TotalAmount) ?? 0m,
                Bookings = group.Count()
            })
            .FirstOrDefaultAsync();

        var totalRevenue = summary?.Revenue ?? 0m;
        var totalConfirmedBookings = summary?.Bookings ?? 0;
        var avgTicketValue = totalConfirmedBookings > 0
            ? Math.Round(totalRevenue / totalConfirmedBookings, 2)
            : 0m;

        var revenueTrend = await BuildRevenueTrendAsync(paidBookings, period, startDate, endDate);

        // GroupBy + OrderBy phải chiếu ra anonymous type trước; EF không dịch được OrderBy trên
        // member của record vừa được dựng bằng constructor trong mệnh đề Select.
        var topMovies = (await paidBookings
            .GroupBy(booking => booking.Showtime.Movie.Title)
            .Select(group => new
            {
                Title = group.Key,
                Revenue = group.Sum(booking => booking.TotalAmount),
                Bookings = group.Count()
            })
            .OrderByDescending(movie => movie.Revenue)
            .Take(5)
            .ToListAsync())
            .Select(movie => new TopMovieRevenueDto(movie.Title, movie.Revenue, movie.Bookings))
            .ToList();

        var cinemaRevenue = (await paidBookings
            .GroupBy(booking => booking.Showtime.Room.Cinema.Name)
            .Select(group => new { Name = group.Key, Revenue = group.Sum(booking => booking.TotalAmount) })
            .OrderByDescending(cinema => cinema.Revenue)
            .ToListAsync())
            .Select(cinema => new CinemaRevenueDto(cinema.Name, cinema.Revenue))
            .ToList();

        return new AdminRevenueAnalyticsDto(period,
            startDate.ToString("yyyy-MM-dd"), endDate.ToString("yyyy-MM-dd"),
            totalRevenue, totalConfirmedBookings, avgTicketValue, revenueTrend, topMovies, cinemaRevenue,
            revenueTrend.Select(item => new DailyRevenueDto(item.Date, item.Revenue)).ToList());
    }

    private static async Task<List<RevenueTrendItemDto>> BuildRevenueTrendAsync(
        IQueryable<Booking> paidBookings, string period, DateTime startDate, DateTime endDate)
    {
        if (period is "week" or "month")
        {
            var byDay = await paidBookings
                .GroupBy(booking => booking.BookingDate.Date)
                .Select(group => new { Day = group.Key, Revenue = group.Sum(booking => booking.TotalAmount) })
                .ToListAsync();
            var revenueByDay = byDay.ToDictionary(item => DateOnly.FromDateTime(item.Day), item => item.Revenue);

            var days = new List<RevenueTrendItemDto>();
            var lastDay = DateOnly.FromDateTime(endDate).AddDays(-1);
            for (var day = DateOnly.FromDateTime(startDate); day <= lastDay; day = day.AddDays(1))
            {
                var label = period == "week"
                    ? WeekdayLabel(day)
                    : day.ToString("dd/MM", CultureInfo.InvariantCulture);
                days.Add(new RevenueTrendItemDto(day.ToString("yyyy-MM-dd"), label,
                    revenueByDay.GetValueOrDefault(day)));
            }
            return days;
        }

        var byMonth = await paidBookings
            .GroupBy(booking => new { booking.BookingDate.Year, booking.BookingDate.Month })
            .Select(group => new { group.Key.Year, group.Key.Month, Revenue = group.Sum(booking => booking.TotalAmount) })
            .ToListAsync();
        var revenueByMonth = byMonth.ToDictionary(item => (item.Year, item.Month), item => item.Revenue);

        var months = new List<RevenueTrendItemDto>();
        for (var cursor = new DateTime(startDate.Year, startDate.Month, 1); cursor < endDate; cursor = cursor.AddMonths(1))
        {
            months.Add(new RevenueTrendItemDto(cursor.ToString("yyyy-MM-dd"), $"Tháng {cursor.Month}",
                revenueByMonth.GetValueOrDefault((cursor.Year, cursor.Month))));
        }
        return months;
    }

    private static (string Period, DateTime Start, DateTime End) ResolveRange(RevenueReportQueryDto query)
    {
        var today = VietnamTime.Today;
        var period = string.IsNullOrWhiteSpace(query.Period) ? "week" : query.Period.Trim().ToLowerInvariant();
        var year = query.Year ?? today.Year;

        switch (period)
        {
            case "week":
                // Không truyền weekStart thì giữ hành vi cũ: tuần lịch hiện tại (giờ Việt Nam), bắt đầu từ thứ Hai.
                var monday = string.IsNullOrWhiteSpace(query.WeekStart)
                    ? VietnamTime.MondayOf(today)
                    : DateOnly.ParseExact(query.WeekStart.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture);
                var weekStart = monday.ToDateTime(TimeOnly.MinValue);
                return (period, weekStart, weekStart.AddDays(7));
            case "month":
                var monthStart = new DateTime(year, query.Month ?? today.Month, 1);
                return (period, monthStart, monthStart.AddMonths(1));
            case "quarter":
                var quarter = query.Quarter ?? (today.Month - 1) / 3 + 1;
                var quarterStart = new DateTime(year, (quarter - 1) * 3 + 1, 1);
                return (period, quarterStart, quarterStart.AddMonths(3));
            default:
                var yearStart = new DateTime(year, 1, 1);
                return (period, yearStart, yearStart.AddYears(1));
        }
    }

    private static string WeekdayLabel(DateOnly day) => day.DayOfWeek switch
    {
        DayOfWeek.Monday => "Thứ 2",
        DayOfWeek.Tuesday => "Thứ 3",
        DayOfWeek.Wednesday => "Thứ 4",
        DayOfWeek.Thursday => "Thứ 5",
        DayOfWeek.Friday => "Thứ 6",
        DayOfWeek.Saturday => "Thứ 7",
        _ => "Chủ nhật"
    };
}
