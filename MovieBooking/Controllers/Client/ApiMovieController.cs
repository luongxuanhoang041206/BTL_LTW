using System.Linq;
using System.IO;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Hosting;
using MovieBooking.Data;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Models;
using MovieBooking.Services;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Client;

[ApiController]
[Route("api/movies")]
public class ApiMovieController : ControllerBase
{
    private const string ReviewTestEmail = "reviewtester@moviebooking.test";
    private static readonly JsonSerializerOptions ReviewJsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public sealed class CreateReviewRequest
    {
        public int Rating { get; set; }
        public string? Comment { get; set; }
    }

    public sealed class ReviewContentDocument
    {
        public string Format { get; set; } = string.Empty;
        public List<ReviewContentBlock> Blocks { get; set; } = new();
        public List<ReviewImageAttachment> Images { get; set; } = new();
    }

    public sealed class ReviewImageAttachment
    {
        public string Src { get; set; } = string.Empty;
        public string? Alt { get; set; }
    }

    public sealed class ReviewContentBlock
    {
        public string Type { get; set; } = string.Empty;
        public List<ReviewContentRun> Runs { get; set; } = new();
        public List<List<ReviewContentRun>> Items { get; set; } = new();
        public bool Ordered { get; set; }
        public string? Src { get; set; }
        public string? Alt { get; set; }
    }

    public sealed class ReviewContentRun
    {
        public string Text { get; set; } = string.Empty;
        public bool Bold { get; set; }
        public bool Italic { get; set; }
        public bool Underline { get; set; }
        public string? FontFamily { get; set; }
        public int? FontSize { get; set; }
        public string? Color { get; set; }
    }

    private readonly IMovieService _movieService;
    private readonly IBookingService _bookingService;
    private readonly IGenreService _genreService;
    private readonly MovieBookingContext _context;

    public ApiMovieController(
        IMovieService movieService,
        IBookingService bookingService,
        IGenreService genreService,
        MovieBookingContext context)
    {
        _movieService = movieService;
        _bookingService = bookingService;
        _genreService = genreService;
        _context = context;
    }

    private static object MapMovie(Movie m, double? averageRating, int reviewCount) => new
    {
        id = m.MovieId,
        title = m.Title,
        description = m.Description,
        duration = m.Duration,
        releaseDate = m.ReleaseDate?.ToString("yyyy-MM-dd"),
        endDate = m.EndDate?.ToString("yyyy-MM-dd"),
        posterUrl = m.PosterUrl,
        trailerUrl = m.TrailerUrl,
        director = m.Director,
        actors = m.Actors,
        language = m.Language,
        ageRating = m.AgeRating,
        status = m.Status,
        averageRating = averageRating.HasValue ? Math.Round(averageRating.Value, 1) : (double?)null,
        reviewCount,
        genres = m.Genres?.Select(g => new { id = g.GenreId, name = g.GenreName }).ToList() ?? new()
    };

    private async Task<IEnumerable<object>> MapMoviesWithRatingsAsync(IEnumerable<Movie> movies)
    {
        var movieList = movies.ToList();
        var movieIds = movieList.Select(movie => movie.MovieId).ToList();
        var ratings = await _context.Reviews.AsNoTracking()
            .Where(review => movieIds.Contains(review.MovieId))
            .GroupBy(review => review.MovieId)
            .Select(group => new
            {
                MovieId = group.Key,
                Average = group.Average(review => (double)review.Rating),
                Count = group.Count()
            })
            .ToDictionaryAsync(result => result.MovieId);

        return movieList.Select(movie => ratings.TryGetValue(movie.MovieId, out var rating)
            ? MapMovie(movie, rating.Average, rating.Count)
            : MapMovie(movie, null, 0));
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status,
        [FromQuery] string? genre,
        [FromQuery] string? search,
        [FromQuery] int page = 1)
    {
        var movies = await _movieService.GetAllMoviesAsync(status, genre, search, page);
        return Ok(await MapMoviesWithRatingsAsync(movies));
    }

    [HttpGet("now-showing")]
    public async Task<IActionResult> GetNowShowing()
    {
        var movies = await _movieService.GetNowShowingMoviesAsync();
        return Ok(await MapMoviesWithRatingsAsync(movies));
    }

    [HttpGet("coming-soon")]
    public async Task<IActionResult> GetComingSoon()
    {
        var movies = await _movieService.GetComingSoonMoviesAsync();
        return Ok(await MapMoviesWithRatingsAsync(movies));
    }

    [HttpGet("genres")]
    public async Task<IActionResult> GetGenres([FromQuery] string? search = null)
    {
        return Ok(await _genreService.GetGenreResponsesAsync(search));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var movie = await _movieService.GetMovieByIdAsync(id);
        if (movie == null)
        {
            return NotFound(new { message = "Không tìm thấy phim." });
        }

        var averageRating = movie.Reviews.Count == 0
            ? (double?)null
            : movie.Reviews.Average(review => (double)review.Rating);
        return Ok(MapMovie(movie, averageRating, movie.Reviews.Count));
    }

    [HttpGet("{id}/cinemas")]
    public async Task<IActionResult> GetCinemasForMovie(int id)
    {
        var cinemas = await _bookingService.GetCinemasForMovieAsync(id);
        return Ok(cinemas);
    }

    [HttpGet("{id}/showtimes")]
    public async Task<IActionResult> GetShowtimes(int id, [FromQuery] int? cinemaId, [FromQuery] DateOnly? date, [FromQuery] string? city, [FromQuery] string? roomType)
    {
        var selection = await _bookingService.GetShowtimeSelectionAsync(id, cinemaId, date, city, roomType);
        if (selection == null)
        {
            return NotFound(new { message = "Không tìm thấy lịch chiếu cho phim này." });
        }

        return Ok(selection);
    }

    [HttpGet("{id}/showtimes/dates")]
    public async Task<IActionResult> GetShowtimeDates(int id)
    {
        var dates = await _movieService.GetUpcomingShowtimeDatesAsync(id);
        if (dates == null) return NotFound(new { message = "Không tìm thấy phim." });

        return Ok(new { movieId = id, dates = dates.Select(d => new { date = d.ToString("yyyy-MM-dd"), hasShowtimes = true }) });
    }

    [HttpGet("{id}/reviews")]
    public async Task<IActionResult> GetReviews(int id, [FromServices] IWebHostEnvironment environment)
    {
        var movieExists = await _context.Movies.AsNoTracking().AnyAsync(m => m.MovieId == id);
        if (!movieExists) return NotFound(new { message = "Không tìm thấy phim." });

        var userId = HttpContext.Session.GetInt32("UserId");
        var isAdmin = string.Equals(HttpContext.Session.GetString("Role"), "Admin", StringComparison.OrdinalIgnoreCase);
        var isReviewTester = environment.IsDevelopment() &&
            string.Equals(HttpContext.Session.GetString("Email"), ReviewTestEmail, StringComparison.OrdinalIgnoreCase);
        var today = DateOnly.FromDateTime(DateTime.Now);
        var currentTime = TimeOnly.FromDateTime(DateTime.Now);

        var reviews = await _context.Reviews.AsNoTracking()
            .Where(r => r.MovieId == id)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new
            {
                id = r.ReviewId,
                userId = r.UserId,
                customerName = r.User.FullName,
                rating = r.Rating,
                comment = r.Comment ?? "",
                createdAt = r.CreatedAt
            })
            .ToListAsync();

        var hasReviewed = !isReviewTester && !isAdmin && userId.HasValue && reviews.Any(r => r.userId == userId.Value);
        var canReview = isReviewTester || isAdmin;
        if (userId.HasValue && !hasReviewed && !isReviewTester && !isAdmin)
        {
            canReview = await _context.Bookings.AsNoTracking().AnyAsync(b =>
                b.UserId == userId.Value && b.Showtime.MovieId == id && b.Status == "Paid" &&
                b.Payments.Any(p => p.PaymentStatus == "Success") &&
                (b.Showtime.ShowDate < today ||
                 (b.Showtime.ShowDate == today && b.Showtime.EndTime <= currentTime)));
        }

        return Ok(new
        {
            reviews = reviews.Select(r => new
            {
                r.id,
                r.customerName,
                r.rating,
                r.comment,
                createdAt = r.createdAt.ToString("yyyy-MM-ddTHH:mm:ss")
            }),
            averageRating = reviews.Count == 0 ? 0 : Math.Round(reviews.Average(r => r.rating), 1),
            reviewCount = reviews.Count,
            canReview,
            hasReviewed,
            isAuthenticated = userId.HasValue,
            isReviewTester,
            isAdmin
        });
    }

    [HttpPost("{id}/reviews")]
    public async Task<IActionResult> CreateReview(
        int id,
        [FromBody] CreateReviewRequest request,
        [FromServices] IWebHostEnvironment environment)
    {
        var userId = HttpContext.Session.GetInt32("UserId");
        if (!userId.HasValue)
            return Unauthorized(new { message = "Vui lòng đăng nhập để đánh giá phim." });
        if (request.Rating is < 1 or > 10)
            return BadRequest(new { message = "Điểm đánh giá phải từ 1 đến 10." });
        var comment = NormalizeReviewComment(request.Comment, out var contentError);
        if (contentError != null)
            return BadRequest(new { message = contentError });

        var movieExists = await _context.Movies.AnyAsync(m => m.MovieId == id);
        if (!movieExists) return NotFound(new { message = "Không tìm thấy phim." });

        var isReviewTester = environment.IsDevelopment() &&
            string.Equals(HttpContext.Session.GetString("Email"), ReviewTestEmail, StringComparison.OrdinalIgnoreCase);
        var isAdmin = string.Equals(HttpContext.Session.GetString("Role"), "Admin", StringComparison.OrdinalIgnoreCase);

        if (!isReviewTester && !isAdmin && await _context.Reviews.AnyAsync(r => r.MovieId == id && r.UserId == userId.Value))
            return Conflict(new { message = "Bạn đã đánh giá phim này rồi." });

        var eligible = isReviewTester || isAdmin;
        if (!eligible)
        {
            var today = DateOnly.FromDateTime(DateTime.Now);
            var currentTime = TimeOnly.FromDateTime(DateTime.Now);
            eligible = await _context.Bookings.AsNoTracking().AnyAsync(b =>
                b.UserId == userId.Value && b.Showtime.MovieId == id && b.Status == "Paid" &&
                b.Payments.Any(p => p.PaymentStatus == "Success") &&
                (b.Showtime.ShowDate < today ||
                 (b.Showtime.ShowDate == today && b.Showtime.EndTime <= currentTime)));
        }

        if (!eligible)
            return Forbid();

        var review = new Review
        {
            UserId = userId.Value,
            MovieId = id,
            Rating = request.Rating,
            Comment = comment,
            CreatedAt = DateTime.Now
        };
        _context.Reviews.Add(review);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Cảm ơn bạn đã đánh giá phim." });
    }

    [HttpPost("reviews/images")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> UploadReviewImage(
        [FromForm] IFormFile file,
        [FromServices] IWebHostEnvironment environment)
    {
        if (HttpContext.Session.GetInt32("UserId") == null)
            return Unauthorized(new { message = "Vui lòng đăng nhập để tải ảnh lên." });
        var saved = await LocalImageStorage.SaveAsync(file, "reviews", environment, cancellationToken: HttpContext.RequestAborted);
        if (saved.Error != null)
            return BadRequest(new { message = saved.Error });

        return Ok(new { url = saved.Url });
    }

    private static string? NormalizeReviewComment(string? comment, out string? error)
    {
        error = null;
        if (string.IsNullOrWhiteSpace(comment)) return null;
        if (comment.Length > 30000)
        {
            error = "Nội dung đánh giá quá dài.";
            return null;
        }

        if (!comment.TrimStart().StartsWith('{'))
        {
            if (comment.Length > 500)
            {
                error = "Nội dung đánh giá quá dài.";
                return null;
            }
            return comment.Trim();
        }

        try
        {
            var document = JsonSerializer.Deserialize<ReviewContentDocument>(comment, ReviewJsonOptions);
            if (document == null || document.Format != "review-v1" || document.Blocks == null || document.Blocks.Count > 30)
                throw new JsonException();

            var characterCount = 0;
            var imageCount = 0;
            if (document.Images == null || document.Images.Count > 5)
                throw new JsonException();

            foreach (var image in document.Images)
            {
                if (image == null || !IsReviewImagePath(image.Src))
                    throw new JsonException();
                imageCount++;
                image.Alt = image.Alt?.Trim();
            }

            foreach (var block in document.Blocks)
            {
                if (block == null) throw new JsonException();
                if (block.Type == "image")
                {
                    imageCount++;
                    if (imageCount > 5 || !IsReviewImagePath(block.Src))
                        throw new JsonException();
                    document.Images.Add(new ReviewImageAttachment { Src = block.Src!, Alt = block.Alt?.Trim() });
                    continue;
                }

                var runGroups = block.Type switch
                {
                    "paragraph" when block.Runs != null => new List<List<ReviewContentRun>> { block.Runs },
                    "list" when block.Items != null && block.Items.Count <= 30 => block.Items,
                    _ => throw new JsonException()
                };

                foreach (var group in runGroups)
                {
                    if (group == null) throw new JsonException();
                    foreach (var run in group)
                    {
                        if (run == null) throw new JsonException();
                        characterCount += run.Text?.Length ?? 0;
                        if (characterCount > 5000) throw new JsonException();
                        run.Text ??= string.Empty;
                        run.FontFamily = run.FontFamily is "Arial" or "Georgia" or "Times New Roman" or "Verdana" or "Tahoma"
                            ? run.FontFamily
                            : null;
                        run.FontSize = run.FontSize.HasValue ? Math.Clamp(run.FontSize.Value, 12, 32) : null;
                        run.Color = run.Color != null && Regex.IsMatch(run.Color, "^#[0-9a-fA-F]{6}$")
                            ? run.Color
                            : null;
                    }
                }
            }

            document.Blocks.RemoveAll(block => block.Type == "image");
            return JsonSerializer.Serialize(document, ReviewJsonOptions);
        }
        catch (JsonException)
        {
            error = "Định dạng nội dung review không hợp lệ. Hãy tải lại trang và thử lại.";
            return null;
        }
    }

    private static bool IsReviewImagePath(string? path) =>
        !string.IsNullOrWhiteSpace(path) &&
        Regex.IsMatch(path, "^/uploads/reviews/[a-f0-9]{32}\\.(jpg|jpeg|png|webp)$", RegexOptions.IgnoreCase);

}
