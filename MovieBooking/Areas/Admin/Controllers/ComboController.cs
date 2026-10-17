using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using MovieBooking.DTOs;
using MovieBooking.Filters;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Areas.Admin.Controllers;

[Area("Admin")]
[SessionAuthorizeRole("Admin")]
public class ComboController : Controller
{
    private readonly IFoodService _foodService;

    public ComboController(IFoodService foodService)
    {
        _foodService = foodService;
    }

    // GET: /Admin/Combo
    [HttpGet]
    public async Task<IActionResult> Index(bool? isActive)
    {
        ViewBag.SelectedIsActive = isActive;
        var combos = await _foodService.GetAllCombosAsync(isActive);
        return View("~/Views/Combo/Index.cshtml", combos);
    }

    // GET: /Admin/Combo/Details/5
    [HttpGet]
    public async Task<IActionResult> Details(int id)
    {
        var combo = await _foodService.GetComboDtoByIdAsync(id);
        if (combo == null) return NotFound();

        return View("~/Views/Combo/Details.cshtml", combo);
    }

    // GET: /Admin/Combo/Create
    [HttpGet]
    public async Task<IActionResult> Create()
    {
        ViewBag.ActiveFoodItems = await _foodService.GetActiveFoodItemsAsync();
        return View("~/Views/Combo/Create.cshtml", new ComboFormDto { IsActive = true });
    }

    // POST: /Admin/Combo/Create
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(ComboFormDto model)
    {
        // Loại bỏ các dòng rỗng nếu có do dynamic form gửi lên
        model.SelectedItems = model.SelectedItems?.Where(x => x.FoodItemId > 0).ToList() ?? new();

        if (!ModelState.IsValid)
        {
            ViewBag.ActiveFoodItems = await _foodService.GetActiveFoodItemsAsync();
            return View("~/Views/Combo/Create.cshtml", model);
        }

        var (success, combo, error) = await _foodService.CreateComboAsync(model);
        if (!success)
        {
            ModelState.AddModelError(string.Empty, error ?? "Không thể tạo combo.");
            ViewBag.ActiveFoodItems = await _foodService.GetActiveFoodItemsAsync();
            return View("~/Views/Combo/Create.cshtml", model);
        }

        TempData["Success"] = $"Tạo Combo '{combo!.Name}' thành công.";
        return RedirectToAction(nameof(Index));
    }

    // GET: /Admin/Combo/Edit/5
    [HttpGet]
    public async Task<IActionResult> Edit(int id)
    {
        var combo = await _foodService.GetComboByIdAsync(id);
        if (combo == null) return NotFound();

        var model = new ComboFormDto
        {
            ComboId = combo.ComboId,
            Name = combo.Name,
            Description = combo.Description,
            ImageUrl = combo.ImageUrl,
            Price = combo.Price,
            IsActive = combo.IsActive,
            SelectedItems = combo.ComboDetails.Select(cd => new ComboItemInputDto
            {
                FoodItemId = cd.FoodItemId,
                Quantity = cd.Quantity
            }).ToList()
        };

        ViewBag.ActiveFoodItems = await _foodService.GetActiveFoodItemsAsync();
        return View("~/Views/Combo/Edit.cshtml", model);
    }

    // POST: /Admin/Combo/Edit/5
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int id, ComboFormDto model)
    {
        model.SelectedItems = model.SelectedItems?.Where(x => x.FoodItemId > 0).ToList() ?? new();

        if (!ModelState.IsValid)
        {
            ViewBag.ActiveFoodItems = await _foodService.GetActiveFoodItemsAsync();
            return View("~/Views/Combo/Edit.cshtml", model);
        }

        var (success, error) = await _foodService.UpdateComboAsync(id, model);
        if (!success)
        {
            ModelState.AddModelError(string.Empty, error ?? "Không thể cập nhật combo.");
            ViewBag.ActiveFoodItems = await _foodService.GetActiveFoodItemsAsync();
            return View("~/Views/Combo/Edit.cshtml", model);
        }

        TempData["Success"] = $"Cập nhật combo '{model.Name}' thành công.";
        return RedirectToAction(nameof(Index));
    }

    // POST: /Admin/Combo/ToggleStatus/5
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> ToggleStatus(int id)
    {
        var success = await _foodService.ToggleComboStatusAsync(id);
        if (!success) return NotFound();

        TempData["Success"] = "Đã thay đổi trạng thái hoạt động của combo.";
        return RedirectToAction(nameof(Index));
    }

    // GET: /Admin/Combo/Delete/5
    [HttpGet]
    public async Task<IActionResult> Delete(int id)
    {
        var combo = await _foodService.GetComboDtoByIdAsync(id);
        if (combo == null) return NotFound();

        var (canDelete, reason) = await _foodService.CanDeleteComboAsync(id);
        ViewBag.CanDelete = canDelete;
        ViewBag.Reason = reason;

        return View("~/Views/Combo/Delete.cshtml", combo);
    }

    // POST: /Admin/Combo/Delete/5
    [HttpPost, ActionName("Delete")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteConfirmed(int id)
    {
        var (success, error) = await _foodService.DeleteComboAsync(id);
        if (!success)
        {
            TempData["Error"] = error;
            return RedirectToAction(nameof(Delete), new { id });
        }

        TempData["Success"] = "Đã xóa combo thành công.";
        return RedirectToAction(nameof(Index));
    }
}
