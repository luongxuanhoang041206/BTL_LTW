using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;

namespace MovieBooking.Controllers.Admin;

public class AdminReviewController : AdminBaseController
{
    public AdminReviewController(MovieBookingContext context) : base(context) { }

    [HttpGet("reviews")]
    public async Task<IActionResult> GetReviews([FromQuery] int? movieId, [FromQuery] int? rating)
    {
        var query = _context.Reviews
            .Include(r => r.Movie)
            .Include(r => r.User)
            .AsNoTracking();

        if (movieId.HasValue && movieId.Value > 0)
            query = query.Where(r => r.MovieId == movieId.Value);

        if (rating.HasValue && rating.Value > 0)
            query = query.Where(r => r.Rating == rating.Value);

        var reviews = await query
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new
            {
                id = r.ReviewId,
                movieId = r.MovieId,
                movieTitle = r.Movie.Title,
                posterUrl = r.Movie.PosterUrl,
                customerName = r.User.FullName,
                customerEmail = r.User.Email,
                rating = r.Rating,
                comment = r.Comment ?? "",
                createdAt = r.CreatedAt.ToString("yyyy-MM-dd HH:mm")
            })
            .ToListAsync();

        return Ok(reviews);
    }

    [HttpDelete("reviews/{id}")]
    public async Task<IActionResult> DeleteReview(int id)
    {
        var review = await _context.Reviews.FindAsync(id);
        if (review == null) return NotFound(new { message = "Không tìm thấy đánh giá." });

        _context.Reviews.Remove(review);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Xóa đánh giá thành công!" });
    }
}
