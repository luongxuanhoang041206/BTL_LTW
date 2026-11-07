using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.DTOs;
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

    public async Task<AdminRevenueAnalyticsDto> GetRevenueAnalyticsAsync()
    {
        var confirmedBookings = await context.Bookings
            .Where(booking => booking.Status == "Paid")
            .Include(booking => booking.Showtime).ThenInclude(showtime => showtime.Movie)
            .Include(booking => booking.Showtime).ThenInclude(showtime => showtime.Room).ThenInclude(room => room.Cinema)
            .AsNoTracking()
            .ToListAsync();

        var totalRevenue = confirmedBookings.Sum(booking => booking.TotalAmount);
        var totalConfirmedBookings = confirmedBookings.Count;
        var averageTicketValue = totalConfirmedBookings > 0 ? totalRevenue / totalConfirmedBookings : 0;
        var today = DateTime.Now.Date;
        var dailyRevenue = new List<DailyRevenueDto>();
        for (int index = 6; index >= 0; index--)
        {
            var day = today.AddDays(-index);
            dailyRevenue.Add(new DailyRevenueDto(day.ToString("dd/MM"), confirmedBookings
                .Where(booking => booking.BookingDate.Date == day).Sum(booking => booking.TotalAmount)));
        }

        var topMovies = confirmedBookings
            .GroupBy(booking => booking.Showtime.Movie.Title)
            .Select(group => new TopMovieRevenueDto(group.Key, group.Sum(booking => booking.TotalAmount), group.Count()))
            .OrderByDescending(movie => movie.Revenue).Take(5).ToList();
        var cinemaRevenue = confirmedBookings
            .GroupBy(booking => booking.Showtime.Room.Cinema.Name)
            .Select(group => new CinemaRevenueDto(group.Key, group.Sum(booking => booking.TotalAmount)))
            .OrderByDescending(cinema => cinema.Revenue).ToList();

        return new AdminRevenueAnalyticsDto(totalRevenue, totalConfirmedBookings, averageTicketValue,
            dailyRevenue, topMovies, cinemaRevenue);
    }

}
