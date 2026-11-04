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
        var totalRevenue = await context.Bookings.Where(booking => booking.Status == "Confirmed")
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
            .Where(booking => booking.Status == "Confirmed")
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

    public async Task<List<ShowtimePerformanceDto>> GetShowtimePerformanceAsync() => await context.Showtimes
        .AsNoTracking()
        .OrderByDescending(showtime => showtime.ShowDate)
        .ThenByDescending(showtime => showtime.StartTime)
        .Take(50)
        .Select(showtime => new ShowtimePerformanceDto(
            showtime.ShowtimeId,
            showtime.Movie.Title,
            showtime.Room.Cinema.Name,
            showtime.Room.RoomName,
            showtime.ShowDate.ToString("yyyy-MM-dd"),
            showtime.StartTime.ToString("HH:mm"),
            showtime.Price,
            showtime.ShowtimeSeats.Count,
            showtime.ShowtimeSeats.Count(seat => seat.Status == "Booked"),
            showtime.ShowtimeSeats.Count > 0
                ? Math.Round((double)showtime.ShowtimeSeats.Count(seat => seat.Status == "Booked") / showtime.ShowtimeSeats.Count * 100, 1)
                : 0,
            showtime.ShowtimeSeats.Count(seat => seat.Status == "Booked") * showtime.Price))
        .ToListAsync();

    public async Task<List<SeatOccupancyDto>> GetSeatOccupancyAsync() => await context.Rooms
        .AsNoTracking()
        .Select(room => new SeatOccupancyDto(
            room.Cinema.Name,
            room.RoomName,
            room.RoomType,
            room.TotalSeats,
            room.Showtimes.Count,
            room.Showtimes.SelectMany(showtime => showtime.ShowtimeSeats).Count(),
            room.Showtimes.SelectMany(showtime => showtime.ShowtimeSeats).Count(seat => seat.Status == "Booked"),
            room.Showtimes.SelectMany(showtime => showtime.ShowtimeSeats).Any()
                ? Math.Round((double)room.Showtimes.SelectMany(showtime => showtime.ShowtimeSeats).Count(seat => seat.Status == "Booked") /
                    room.Showtimes.SelectMany(showtime => showtime.ShowtimeSeats).Count() * 100, 1)
                : 0))
        .ToListAsync();
}
