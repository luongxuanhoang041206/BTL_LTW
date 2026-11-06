using Microsoft.AspNetCore.Mvc;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Admin;

public class AdminReviewController : AdminBaseController
{
    private readonly IReviewService _reviewService;

    public AdminReviewController(IReviewService reviewService) : base()
    {
        _reviewService = reviewService;
    }

    [HttpGet("reviews")]
    public async Task<IActionResult> GetReviews([FromQuery] int? movieId, [FromQuery] int? rating)
    {
        return Ok(await _reviewService.GetReviewsAsync(movieId, rating));
    }

    [HttpDelete("reviews/{id}")]
    public async Task<IActionResult> DeleteReview(int id)
    {
        if (!await _reviewService.DeleteReviewAsync(id))
            return NotFound(new { message = "Không tìm thấy đánh giá." });
        return Ok(new { success = true, message = "Xóa đánh giá thành công!" });
    }
}
