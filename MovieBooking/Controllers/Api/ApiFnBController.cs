using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Api;

[ApiController]
[Route("api/fnb")]
public class ApiFnBController : ControllerBase
{
    private readonly IFoodService _foodService;
    private readonly ICinemaService _cinemaService;

    public ApiFnBController(IFoodService foodService, ICinemaService cinemaService)
    {
        _foodService = foodService;
        _cinemaService = cinemaService;
    }

    /// <summary>
    /// Lấy danh mục món ăn / đồ uống đang hoạt động.
    /// Hỗ trợ lọc theo category và kiểm tra cinemaId (nếu được truyền).
    /// </summary>
    [HttpGet("foods")]
    [HttpGet("/api/foods")]
    public async Task<IActionResult> GetFoods([FromQuery] string? category, [FromQuery] int? cinemaId)
    {
        if (cinemaId.HasValue && !await _cinemaService.CinemaExistsAsync(cinemaId.Value))
        {
            return NotFound(new { message = $"Rạp với ID {cinemaId.Value} không tồn tại." });
        }

        var foods = await _foodService.GetActiveFoodItemsAsync(category);
        return Ok(foods);
    }

    /// <summary>
    /// Lấy chi tiết một món ăn / đồ uống đang hoạt động.
    /// </summary>
    [HttpGet("foods/{id}")]
    [HttpGet("/api/foods/{id}")]
    public async Task<IActionResult> GetFoodById(int id)
    {
        var item = await _foodService.GetFoodItemByIdAsync(id);
        if (item == null || !item.IsActive)
        {
            return NotFound(new { message = "Không tìm thấy món ăn hoặc món đã ngừng kinh doanh." });
        }

        return Ok(new
        {
            foodItemId = item.FoodItemId,
            name = item.Name,
            description = item.Description,
            imageUrl = item.ImageUrl,
            price = item.Price,
            category = item.Category
        });
    }

    /// <summary>
    /// Lấy danh sách các Combo đang hoạt động kèm thành phần món.
    /// Hỗ trợ kiểm tra cinemaId (nếu được truyền).
    /// </summary>
    [HttpGet("combos")]
    [HttpGet("/api/combos")]
    public async Task<IActionResult> GetCombos([FromQuery] int? cinemaId)
    {
        if (cinemaId.HasValue && !await _cinemaService.CinemaExistsAsync(cinemaId.Value))
        {
            return NotFound(new { message = $"Rạp với ID {cinemaId.Value} không tồn tại." });
        }

        var combos = await _foodService.GetActiveCombosAsync();
        return Ok(combos);
    }

    /// <summary>
    /// Lấy thông tin chi tiết một Combo đang hoạt động kèm thành phần.
    /// </summary>
    [HttpGet("combos/{id}")]
    [HttpGet("/api/combos/{id}")]
    public async Task<IActionResult> GetComboById(int id)
    {
        var combo = await _foodService.GetActiveComboByIdAsync(id);
        if (combo == null)
        {
            return NotFound(new { message = "Không tìm thấy combo hoặc combo đã ngừng áp dụng." });
        }

        return Ok(combo);
    }

    /// <summary>
    /// Lấy toàn bộ thực đơn F&B (Món lẻ + Combo) cho giao diện đặt bắp nước.
    /// </summary>
    [HttpGet("menu")]
    public async Task<IActionResult> GetFullMenu([FromQuery] int? cinemaId)
    {
        if (cinemaId.HasValue && !await _cinemaService.CinemaExistsAsync(cinemaId.Value))
        {
            return NotFound(new { message = $"Rạp với ID {cinemaId.Value} không tồn tại." });
        }

        var foods = await _foodService.GetActiveFoodItemsAsync();
        var combos = await _foodService.GetActiveCombosAsync();
        var categories = await _foodService.GetAllCategoriesAsync();

        return Ok(new
        {
            cinemaId,
            categories,
            foods,
            combos
        });
    }
}
