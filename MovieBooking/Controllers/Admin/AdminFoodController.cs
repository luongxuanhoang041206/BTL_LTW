using Microsoft.AspNetCore.Mvc;
using MovieBooking.DTOs;
using MovieBooking.Filters;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Controllers.Admin;

[ApiController]
[Route("api/admin/fnb")]
[SessionAuthorizeRole("Admin")]
public class AdminFoodController : ControllerBase
{
    private readonly IFoodService _foodService;

    public AdminFoodController(IFoodService foodService)
    {
        _foodService = foodService;
    }

    private IActionResult? RequireAdmin()
    {
        var role = HttpContext.Session.GetString("Role");
        if (role == "Admin") return null;
        return role == null
            ? Unauthorized(new { message = "Vui lòng đăng nhập bằng tài khoản quản trị." })
            : StatusCode(StatusCodes.Status403Forbidden,
                new { message = "Bạn không có quyền thực hiện thao tác này." });
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var denied = RequireAdmin();
        if (denied != null) return denied;
        return Ok(await _foodService.GetAllCategoriesAsync());
    }

    [HttpGet("foods")]
    public async Task<IActionResult> GetFoods([FromQuery] string? category, [FromQuery] bool? isActive)
    {
        var denied = RequireAdmin();
        if (denied != null) return denied;
        return Ok(await _foodService.GetAllFoodItemsAsync(category, isActive));
    }

    [HttpGet("foods/{id:int}")]
    public async Task<IActionResult> GetFood(int id)
    {
        var denied = RequireAdmin();
        if (denied != null) return denied;
        var food = await _foodService.GetFoodItemByIdAsync(id);
        return food == null ? NotFound(new { message = "Không tìm thấy món ăn." }) : Ok(food);
    }

    [HttpPost("foods")]
    public async Task<IActionResult> CreateFood([FromBody] FoodItemFormDto request)
    {
        var denied = RequireAdmin();
        if (denied != null) return denied;
        var food = await _foodService.CreateFoodItemAsync(request);
        return CreatedAtAction(nameof(GetFood), new { id = food.FoodItemId }, food);
    }

    [HttpPut("foods/{id:int}")]
    public async Task<IActionResult> UpdateFood(int id, [FromBody] FoodItemFormDto request)
    {
        var denied = RequireAdmin();
        if (denied != null) return denied;
        if (!await _foodService.UpdateFoodItemAsync(id, request))
            return NotFound(new { message = "Không tìm thấy món ăn." });
        return Ok(new { success = true, message = "Cập nhật món ăn thành công." });
    }

    [HttpPatch("foods/{id:int}/toggle")]
    public async Task<IActionResult> ToggleFood(int id)
    {
        var denied = RequireAdmin();
        if (denied != null) return denied;
        if (!await _foodService.ToggleFoodItemStatusAsync(id))
            return NotFound(new { message = "Không tìm thấy món ăn." });
        return Ok(new { success = true });
    }

    [HttpDelete("foods/{id:int}")]
    public async Task<IActionResult> DeleteFood(int id)
    {
        var denied = RequireAdmin();
        if (denied != null) return denied;
        var (success, error) = await _foodService.DeleteFoodItemAsync(id);
        if (!success) return Conflict(new { success = false, message = error ?? "Không thể xóa món ăn." });
        return Ok(new { success = true, message = "Đã xóa món ăn." });
    }

    [HttpGet("combos")]
    public async Task<IActionResult> GetCombos([FromQuery] bool? isActive)
    {
        var denied = RequireAdmin();
        if (denied != null) return denied;
        return Ok(await _foodService.GetAllCombosAsync(isActive));
    }

    [HttpGet("combos/{id:int}")]
    public async Task<IActionResult> GetCombo(int id)
    {
        var denied = RequireAdmin();
        if (denied != null) return denied;
        var combo = await _foodService.GetComboDtoByIdAsync(id);
        return combo == null ? NotFound(new { message = "Không tìm thấy combo." }) : Ok(combo);
    }

    [HttpPost("combos")]
    public async Task<IActionResult> CreateCombo([FromBody] ComboFormDto request)
    {
        var denied = RequireAdmin();
        if (denied != null) return denied;
        request.SelectedItems = (request.SelectedItems ?? new()).Where(item => item.FoodItemId > 0).ToList();
        var (success, combo, error) = await _foodService.CreateComboAsync(request);
        if (!success || combo == null)
            return BadRequest(new { success = false, message = error ?? "Không thể tạo combo." });
        return CreatedAtAction(nameof(GetCombo), new { id = combo.ComboId }, combo);
    }

    [HttpPut("combos/{id:int}")]
    public async Task<IActionResult> UpdateCombo(int id, [FromBody] ComboFormDto request)
    {
        var denied = RequireAdmin();
        if (denied != null) return denied;
        request.SelectedItems = (request.SelectedItems ?? new()).Where(item => item.FoodItemId > 0).ToList();
        var (success, error) = await _foodService.UpdateComboAsync(id, request);
        if (!success) return BadRequest(new { success = false, message = error ?? "Không thể cập nhật combo." });
        return Ok(new { success = true, message = "Cập nhật combo thành công." });
    }

    [HttpPatch("combos/{id:int}/toggle")]
    public async Task<IActionResult> ToggleCombo(int id)
    {
        var denied = RequireAdmin();
        if (denied != null) return denied;
        if (!await _foodService.ToggleComboStatusAsync(id))
            return NotFound(new { message = "Không tìm thấy combo." });
        return Ok(new { success = true });
    }

    [HttpDelete("combos/{id:int}")]
    public async Task<IActionResult> DeleteCombo(int id)
    {
        var denied = RequireAdmin();
        if (denied != null) return denied;
        var (success, error) = await _foodService.DeleteComboAsync(id);
        if (!success) return Conflict(new { success = false, message = error ?? "Không thể xóa combo." });
        return Ok(new { success = true, message = "Đã xóa combo." });
    }
}
