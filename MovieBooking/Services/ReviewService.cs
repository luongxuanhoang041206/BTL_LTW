using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.DTOs;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Services;

public sealed class ReviewService(MovieBookingContext context) : IReviewService
{
    public async Task<List<AdminReviewDto>> GetReviewsAsync(int? movieId, int? rating)
    {
        var query = context.Reviews
            .AsNoTracking()
            .AsQueryable();

        if (movieId.HasValue && movieId.Value > 0)
            query = query.Where(review => review.MovieId == movieId.Value);

        if (rating.HasValue && rating.Value > 0)
            query = query.Where(review => review.Rating == rating.Value);

        return await query
            .OrderByDescending(review => review.CreatedAt)
            .Select(review => new AdminReviewDto(
                review.ReviewId,
                review.MovieId,
                review.Movie.Title,
                review.Movie.PosterUrl,
                review.User.FullName,
                review.User.Email,
                review.Rating,
                review.Comment ?? "",
                review.CreatedAt.ToString("yyyy-MM-dd HH:mm")))
            .ToListAsync();
    }

    public async Task<bool> DeleteReviewAsync(int id)
    {
        var review = await context.Reviews.FindAsync(id);
        if (review == null) return false;

        context.Reviews.Remove(review);
        await context.SaveChangesAsync();
        return true;
    }
}
