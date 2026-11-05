namespace MovieBooking.DTOs;

public sealed record AdminDashboardDto(int TotalBookings, decimal TotalRevenue, int ActiveShowsCount,
    int TotalUsers, List<RecentShowDto> RecentShows);
public sealed record RecentShowDto(int ShowtimeId, string MovieTitle, string ShowDate, string StartTime, decimal Price);
public sealed record DailyRevenueDto(string Date, decimal Revenue);
public sealed record TopMovieRevenueDto(string MovieTitle, decimal Revenue, int BookingsCount);
public sealed record CinemaRevenueDto(string CinemaName, decimal Revenue);
public sealed record AdminRevenueAnalyticsDto(decimal TotalRevenue, int TotalConfirmedBookings, decimal AvgTicketValue,
    List<DailyRevenueDto> DailyRevenue, List<TopMovieRevenueDto> TopMovies, List<CinemaRevenueDto> CinemaRevenue);
