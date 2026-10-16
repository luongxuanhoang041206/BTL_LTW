using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.DTOs;
using MovieBooking.Filters;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Areas.Admin.Controllers;

[Area("Admin")]
[SessionAuthorizeRole("Admin")]
public class FoodItemController : Controller
{
    private readonly IFoodService _foodService;

    public FoodItemController(IFoodService foodService)
    {
        _foodService = foodService;
    }

    // GET: /Admin/FoodItem
    [HttpGet]
    public async Task<IActionResult> Index(string? category, bool? isActive)
    {
        ViewBag.Categories = await _foodService.GetAllCategoriesAsync();
        ViewBag.SelectedCategory = category;
        ViewBag.SelectedIsActive = isActive;

        var items = await _foodService.GetAllFoodItemsAsync(category, isActive);
        return View("~/Views/FoodItem/Index.cshtml", items);
    }

    // GET: /Admin/FoodItem/Details/5
    [HttpGet]
    public async Task<IActionResult> Details(int id)
    {
        var item = await _foodService.GetFoodItemByIdAsync(id);
        if (item == null) return NotFound();

        return View("~/Views/FoodItem/Details.cshtml", item);
    }

    // GET: /Admin/FoodItem/Create
    [HttpGet]
    public async Task<IActionResult> Create()
    {
        ViewBag.Categories = await _foodService.GetAllCategoriesAsync();
        return View("~/Views/FoodItem/Create.cshtml", new FoodItemFormDto { IsActive = true, Category = "Bắp rang" });
    }

    // POST: /Admin/FoodItem/Create
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(FoodItemFormDto model)
    {
        if (!ModelState.IsValid)
        {
            ViewBag.Categories = await _foodService.GetAllCategoriesAsync();
            return View("~/Views/FoodItem/Create.cshtml", model);
        }

        var item = await _foodService.CreateFoodItemAsync(model);
        TempData["Success"] = $"Đã tạo món '{item.Name}' thành công.";
        return RedirectToAction(nameof(Index));
    }

    // GET: /Admin/FoodItem/Edit/5
    [HttpGet]
    public async Task<IActionResult> Edit(int id)
    {
        var item = await _foodService.GetFoodItemByIdAsync(id);
        if (item == null) return NotFound();

        var model = new FoodItemFormDto
        {
            FoodItemId = item.FoodItemId,
            Name = item.Name,
            Description = item.Description,
            ImageUrl = item.ImageUrl,
            Price = item.Price,
            Category = item.Category,
            IsActive = item.IsActive
        };

        ViewBag.Categories = await _foodService.GetAllCategoriesAsync();
        return View("~/Views/FoodItem/Edit.cshtml", model);
    }

    // POST: /Admin/FoodItem/Edit/5
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int id, FoodItemFormDto model)
    {
        if (!ModelState.IsValid)
        {
            ViewBag.Categories = await _foodService.GetAllCategoriesAsync();
            return View("~/Views/FoodItem/Edit.cshtml", model);
        }

        var success = await _foodService.UpdateFoodItemAsync(id, model);
        if (!success) return NotFound();

        TempData["Success"] = $"Cập nhật món '{model.Name}' thành công.";
        return RedirectToAction(nameof(Index));
    }

    // POST: /Admin/FoodItem/ToggleStatus/5
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> ToggleStatus(int id)
    {
        var success = await _foodService.ToggleFoodItemStatusAsync(id);
        if (!success) return NotFound();

        TempData["Success"] = "Đã thay đổi trạng thái kinh doanh của món.";
        return RedirectToAction(nameof(Index));
    }

    // GET: /Admin/FoodItem/Delete/5
    [HttpGet]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await _foodService.GetFoodItemByIdAsync(id);
        if (item == null) return NotFound();

        var (canDelete, reason) = await _foodService.CanDeleteFoodItemAsync(id);
        ViewBag.CanDelete = canDelete;
        ViewBag.Reason = reason;

        return View("~/Views/FoodItem/Delete.cshtml", item);
    }

    // POST: /Admin/FoodItem/Delete/5
    [HttpPost, ActionName("Delete")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteConfirmed(int id)
    {
        var (success, error) = await _foodService.DeleteFoodItemAsync(id);
        if (!success)
        {
            TempData["Error"] = error;
            return RedirectToAction(nameof(Delete), new { id });
        }

        TempData["Success"] = "Đã xóa món thành công.";
        return RedirectToAction(nameof(Index));
    }
}
