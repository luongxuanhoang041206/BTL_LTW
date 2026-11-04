using MovieBooking.DTOs;

namespace MovieBooking.Services.Interfaces;

public interface IAdminReportingService
{
    Task<AdminDashboardDto> GetDashboardAsync();
    Task<AdminRevenueAnalyticsDto> GetRevenueAnalyticsAsync();
    Task<List<ShowtimePerformanceDto>> GetShowtimePerformanceAsync();
    Task<List<SeatOccupancyDto>> GetSeatOccupancyAsync();
}
