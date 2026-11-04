using MovieBooking.DTOs;

namespace MovieBooking.Services.Interfaces;

public interface IReviewService
{
    Task<List<AdminReviewDto>> GetReviewsAsync(int? movieId, int? rating);

    Task<bool> DeleteReviewAsync(int id);
}
