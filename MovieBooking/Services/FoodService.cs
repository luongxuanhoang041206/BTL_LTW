using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.DTOs;
using MovieBooking.Models;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Services;

public class FoodService : IFoodService
{
    private readonly MovieBookingContext _context;

    public FoodService(MovieBookingContext context)
    {
        _context = context;
    }

    // =========================================================
    // ADMIN: FOOD ITEMS
    // =========================================================

    public async Task<List<FoodItemDto>> GetAllFoodItemsAsync(string? category = null, bool? isActive = null)
    {
        var query = _context.FoodItems.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(category))
        {
            query = query.Where(f => f.Category == category);
        }

        if (isActive.HasValue)
        {
            query = query.Where(f => f.IsActive == isActive.Value);
        }

        return await query
            .OrderBy(f => f.Category)
            .ThenBy(f => f.Name)
            .Select(f => new FoodItemDto
            {
                FoodItemId = f.FoodItemId,
                Name = f.Name,
                Description = f.Description,
                ImageUrl = f.ImageUrl,
                Price = f.Price,
                Category = f.Category,
                IsActive = f.IsActive
            })
            .ToListAsync();
    }

    public async Task<FoodItemDto?> GetFoodItemByIdAsync(int id)
    {
        return await _context.FoodItems
            .AsNoTracking()
            .Where(f => f.FoodItemId == id)
            .Select(f => new FoodItemDto
            {
                FoodItemId = f.FoodItemId,
                Name = f.Name,
                Description = f.Description,
                ImageUrl = f.ImageUrl,
                Price = f.Price,
                Category = f.Category,
                IsActive = f.IsActive
            })
            .FirstOrDefaultAsync();
    }

    public async Task<ActiveFoodItemDetailsDto?> GetActiveFoodItemDetailsAsync(int id)
        => await _context.FoodItems.AsNoTracking()
            .Where(item => item.FoodItemId == id && item.IsActive)
            .Select(item => new ActiveFoodItemDetailsDto(item.FoodItemId, item.Name,
                item.Description, item.ImageUrl, item.Price, item.Category))
            .FirstOrDefaultAsync();

    public async Task<ActiveFoodMenuDto> GetActiveMenuAsync(int? cinemaId)
    {
        var categories = await GetAllCategoriesAsync();
        var foods = await GetActiveFoodItemsAsync();
        var combos = await GetActiveCombosAsync();
        return new ActiveFoodMenuDto(cinemaId, categories, foods, combos);
    }

    public async Task<FoodItemDto> CreateFoodItemAsync(FoodItemFormDto model)
    {
        var foodItem = new FoodItem
        {
            Name = model.Name.Trim(),
            Description = model.Description?.Trim(),
            ImageUrl = model.ImageUrl?.Trim(),
            Price = model.Price,
            Category = model.Category.Trim(),
            IsActive = model.IsActive
        };

        _context.FoodItems.Add(foodItem);
        await _context.SaveChangesAsync();
        return new FoodItemDto
        {
            FoodItemId = foodItem.FoodItemId,
            Name = foodItem.Name,
            Description = foodItem.Description,
            ImageUrl = foodItem.ImageUrl,
            Price = foodItem.Price,
            Category = foodItem.Category,
            IsActive = foodItem.IsActive
        };
    }

    public async Task<bool> UpdateFoodItemAsync(int id, FoodItemFormDto model)
    {
        var item = await _context.FoodItems.FindAsync(id);
        if (item == null) return false;

        item.Name = model.Name.Trim();
        item.Description = model.Description?.Trim();
        item.ImageUrl = model.ImageUrl?.Trim();
        item.Price = model.Price;
        item.Category = model.Category.Trim();
        item.IsActive = model.IsActive;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ToggleFoodItemStatusAsync(int id)
    {
        var item = await _context.FoodItems.FindAsync(id);
        if (item == null) return false;

        item.IsActive = !item.IsActive;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<(bool CanDelete, string? Reason)> CanDeleteFoodItemAsync(int id)
    {
        var isInCombo = await _context.ComboDetails
            .Include(cd => cd.Combo)
            .AnyAsync(cd => cd.FoodItemId == id);

        if (isInCombo)
        {
            return (false, "Món này đang nằm trong một hoặc nhiều Combo. Vui lòng gỡ khỏi combo hoặc vô hiệu hóa (tắt kích hoạt) thay vì xóa.");
        }

        return (true, null);
    }

    public async Task<(bool Success, string? Error)> DeleteFoodItemAsync(int id)
    {
        var item = await _context.FoodItems.FindAsync(id);
        if (item == null)
        {
            return (false, "Không tìm thấy món ăn/đồ uống.");
        }

        var (canDelete, reason) = await CanDeleteFoodItemAsync(id);
        if (!canDelete)
        {
            return (false, reason);
        }

        try
        {
            _context.FoodItems.Remove(item);
            await _context.SaveChangesAsync();
            return (true, null);
        }
        catch (Exception ex)
        {
            return (false, "Không thể xóa món này do ràng buộc dữ liệu: " + ex.Message);
        }
    }

    public async Task<List<string>> GetAllCategoriesAsync()
    {
        return await _context.FoodItems
            .AsNoTracking()
            .Select(f => f.Category)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();
    }

    // =========================================================
    // ADMIN: COMBOS
    // =========================================================

    public async Task<List<ComboDto>> GetAllCombosAsync(bool? isActive = null)
    {
        var query = _context.Combos
            .Include(c => c.ComboDetails)
                .ThenInclude(cd => cd.FoodItem)
            .AsNoTracking()
            .AsQueryable();

        if (isActive.HasValue)
        {
            query = query.Where(c => c.IsActive == isActive.Value);
        }

        var combos = await query.OrderBy(c => c.Name).ToListAsync();

        return combos.Select(c => new ComboDto
        {
            ComboId = c.ComboId,
            Name = c.Name,
            Description = c.Description,
            ImageUrl = c.ImageUrl,
            Price = c.Price,
            IsActive = c.IsActive,
            Items = c.ComboDetails.Select(cd => new ComboDetailDto
            {
                FoodItemId = cd.FoodItemId,
                FoodItemName = cd.FoodItem.Name,
                FoodItemImageUrl = cd.FoodItem.ImageUrl,
                FoodItemPrice = cd.FoodItem.Price,
                Quantity = cd.Quantity
            }).ToList()
        }).ToList();
    }

    public async Task<ComboDto?> GetComboDtoByIdAsync(int id)
    {
        var combo = await _context.Combos
            .Include(c => c.ComboDetails)
                .ThenInclude(cd => cd.FoodItem)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.ComboId == id);

        if (combo == null) return null;

        return new ComboDto
        {
            ComboId = combo.ComboId,
            Name = combo.Name,
            Description = combo.Description,
            ImageUrl = combo.ImageUrl,
            Price = combo.Price,
            IsActive = combo.IsActive,
            Items = combo.ComboDetails.Select(cd => new ComboDetailDto
            {
                FoodItemId = cd.FoodItemId,
                FoodItemName = cd.FoodItem.Name,
                FoodItemImageUrl = cd.FoodItem.ImageUrl,
                FoodItemPrice = cd.FoodItem.Price,
                Quantity = cd.Quantity
            }).ToList()
        };
    }

    public async Task<Combo?> GetComboByIdAsync(int id)
    {
        return await _context.Combos
            .Include(c => c.ComboDetails)
                .ThenInclude(cd => cd.FoodItem)
            .FirstOrDefaultAsync(c => c.ComboId == id);
    }

    public async Task<(bool Success, ComboDto? Combo, string? Error)> CreateComboAsync(ComboFormDto model)
    {
        model.SelectedItems = (model.SelectedItems ?? new()).Where(item => item.FoodItemId > 0).ToList();
        if (model.SelectedItems == null || model.SelectedItems.Count == 0)
        {
            return (false, null, "Combo phải có ít nhất một món thành phần.");
        }

        // Validate không trùng FoodItemId
        var duplicateIds = model.SelectedItems
            .GroupBy(x => x.FoodItemId)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToList();

        if (duplicateIds.Count > 0)
        {
            return (false, null, "Không được chọn trùng món trong cùng một combo. Hãy cộng gộp số lượng.");
        }

        // Validate số lượng > 0
        if (model.SelectedItems.Any(x => x.Quantity <= 0))
        {
            return (false, null, "Số lượng món thành phần phải lớn hơn 0.");
        }

        // Validate các món thành phần có tồn tại và đang hoạt động
        var foodIds = model.SelectedItems.Select(x => x.FoodItemId).ToList();
        var validFoodItems = await _context.FoodItems
            .Where(f => foodIds.Contains(f.FoodItemId) && f.IsActive)
            .ToListAsync();

        if (validFoodItems.Count != foodIds.Count)
        {
            return (false, null, "Một hoặc nhiều món được chọn không hợp lệ hoặc đã ngừng kinh doanh.");
        }

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var combo = new Combo
            {
                Name = model.Name.Trim(),
                Description = model.Description?.Trim(),
                ImageUrl = model.ImageUrl?.Trim(),
                Price = model.Price,
                IsActive = model.IsActive
            };

            _context.Combos.Add(combo);
            await _context.SaveChangesAsync();

            foreach (var item in model.SelectedItems)
            {
                _context.ComboDetails.Add(new ComboDetail
                {
                    ComboId = combo.ComboId,
                    FoodItemId = item.FoodItemId,
                    Quantity = item.Quantity
                });
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return (true, await GetComboDtoByIdAsync(combo.ComboId), null);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return (false, null, "Lỗi khi lưu combo: " + ex.Message);
        }
    }

    public async Task<(bool Success, string? Error)> UpdateComboAsync(int id, ComboFormDto model)
    {
        model.SelectedItems = (model.SelectedItems ?? new()).Where(item => item.FoodItemId > 0).ToList();
        var combo = await _context.Combos
            .Include(c => c.ComboDetails)
            .FirstOrDefaultAsync(c => c.ComboId == id);

        if (combo == null)
        {
            return (false, "Không tìm thấy combo.");
        }

        if (model.SelectedItems == null || model.SelectedItems.Count == 0)
        {
            return (false, "Combo phải có ít nhất một món thành phần.");
        }

        // Validate không trùng FoodItemId
        var duplicateIds = model.SelectedItems
            .GroupBy(x => x.FoodItemId)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToList();

        if (duplicateIds.Count > 0)
        {
            return (false, "Không được chọn trùng món trong cùng một combo. Hãy cộng gộp số lượng.");
        }

        // Validate số lượng > 0
        if (model.SelectedItems.Any(x => x.Quantity <= 0))
        {
            return (false, "Số lượng món thành phần phải lớn hơn 0.");
        }

        // Validate các món thành phần có tồn tại và đang hoạt động
        var foodIds = model.SelectedItems.Select(x => x.FoodItemId).ToList();
        var validFoodItems = await _context.FoodItems
            .Where(f => foodIds.Contains(f.FoodItemId) && f.IsActive)
            .ToListAsync();

        if (validFoodItems.Count != foodIds.Count)
        {
            return (false, "Một hoặc nhiều món được chọn không hợp lệ hoặc đã ngừng kinh doanh.");
        }

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            combo.Name = model.Name.Trim();
            combo.Description = model.Description?.Trim();
            combo.ImageUrl = model.ImageUrl?.Trim();
            combo.Price = model.Price;
            combo.IsActive = model.IsActive;

            // Xóa toàn bộ chi tiết cũ rồi thêm mới
            _context.ComboDetails.RemoveRange(combo.ComboDetails);

            foreach (var item in model.SelectedItems)
            {
                _context.ComboDetails.Add(new ComboDetail
                {
                    ComboId = combo.ComboId,
                    FoodItemId = item.FoodItemId,
                    Quantity = item.Quantity
                });
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return (true, null);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return (false, "Lỗi khi cập nhật combo: " + ex.Message);
        }
    }

    public async Task<bool> ToggleComboStatusAsync(int id)
    {
        var combo = await _context.Combos.FindAsync(id);
        if (combo == null) return false;

        combo.IsActive = !combo.IsActive;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<(bool CanDelete, string? Reason)> CanDeleteComboAsync(int id)
    {
        var hasBooking = await _context.BookingCombos.AnyAsync(bc => bc.ComboId == id);
        if (hasBooking)
        {
            return (false, "Combo này đã phát sinh trong các đơn đặt vé trước đây. Để đảm bảo dữ liệu lịch sử, không thể xóa vĩnh viễn. Vui lòng tắt 'Đang áp dụng' (IsActive = false).");
        }

        return (true, null);
    }

    public async Task<(bool Success, string? Error)> DeleteComboAsync(int id)
    {
        var combo = await _context.Combos
            .Include(c => c.ComboDetails)
            .FirstOrDefaultAsync(c => c.ComboId == id);

        if (combo == null)
        {
            return (false, "Không tìm thấy combo.");
        }

        var (canDelete, reason) = await CanDeleteComboAsync(id);
        if (!canDelete)
        {
            return (false, reason);
        }

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            _context.ComboDetails.RemoveRange(combo.ComboDetails);
            _context.Combos.Remove(combo);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return (true, null);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return (false, "Lỗi khi xóa combo: " + ex.Message);
        }
    }

    // =========================================================
    // CLIENT API
    // =========================================================

    public async Task<List<FoodItemDto>> GetActiveFoodItemsAsync(string? category = null)
    {
        var query = _context.FoodItems
            .AsNoTracking()
            .Where(f => f.IsActive);

        if (!string.IsNullOrWhiteSpace(category))
        {
            query = query.Where(f => f.Category == category);
        }

        return await query
            .OrderBy(f => f.Category)
            .ThenBy(f => f.Name)
            .Select(f => new FoodItemDto
            {
                FoodItemId = f.FoodItemId,
                Name = f.Name,
                Description = f.Description,
                ImageUrl = f.ImageUrl,
                Price = f.Price,
                Category = f.Category,
                IsActive = f.IsActive
            })
            .ToListAsync();
    }

    public async Task<List<ComboDto>> GetActiveCombosAsync()
    {
        var combos = await _context.Combos
            .Include(c => c.ComboDetails)
                .ThenInclude(cd => cd.FoodItem)
            .AsNoTracking()
            .Where(c => c.IsActive)
            .OrderBy(c => c.Name)
            .ToListAsync();

        return combos.Select(c => new ComboDto
        {
            ComboId = c.ComboId,
            Name = c.Name,
            Description = c.Description,
            ImageUrl = c.ImageUrl,
            Price = c.Price,
            IsActive = c.IsActive,
            Items = c.ComboDetails.Select(cd => new ComboDetailDto
            {
                FoodItemId = cd.FoodItemId,
                FoodItemName = cd.FoodItem.Name,
                FoodItemImageUrl = cd.FoodItem.ImageUrl,
                FoodItemPrice = cd.FoodItem.Price,
                Quantity = cd.Quantity
            }).ToList()
        }).ToList();
    }

    public async Task<ComboDto?> GetActiveComboByIdAsync(int id)
    {
        var combo = await _context.Combos
            .Include(c => c.ComboDetails)
                .ThenInclude(cd => cd.FoodItem)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.ComboId == id && c.IsActive);

        if (combo == null) return null;

        return new ComboDto
        {
            ComboId = combo.ComboId,
            Name = combo.Name,
            Description = combo.Description,
            ImageUrl = combo.ImageUrl,
            Price = combo.Price,
            IsActive = combo.IsActive,
            Items = combo.ComboDetails.Select(cd => new ComboDetailDto
            {
                FoodItemId = cd.FoodItemId,
                FoodItemName = cd.FoodItem.Name,
                FoodItemImageUrl = cd.FoodItem.ImageUrl,
                FoodItemPrice = cd.FoodItem.Price,
                Quantity = cd.Quantity
            }).ToList()
        };
    }

    // =========================================================
    // BOOKING INTEGRATION
    // =========================================================

    public async Task<(bool Success, decimal TotalComboPrice, List<BookingComboDetailDto> ValidatedCombos, string? Error)>
        ValidateAndCalculateCombosAsync(List<BookingComboItemRequest>? requests)
    {
        if (requests == null || requests.Count == 0)
        {
            return (true, 0m, new List<BookingComboDetailDto>(), null);
        }

        // Validate không trùng ComboId
        var duplicates = requests.GroupBy(r => r.ComboId).Where(g => g.Count() > 1).ToList();
        if (duplicates.Count > 0)
        {
            return (false, 0m, new(), "Danh sách combo bị trùng lặp. Vui lòng cộng gộp số lượng.");
        }

        // Validate Quantity > 0
        if (requests.Any(r => r.Quantity <= 0))
        {
            return (false, 0m, new(), "Số lượng combo phải lớn hơn 0.");
        }

        var comboIds = requests.Select(r => r.ComboId).ToList();
        var combosInDb = await _context.Combos
            .AsNoTracking()
            .Where(c => comboIds.Contains(c.ComboId))
            .ToDictionaryAsync(c => c.ComboId);

        decimal total = 0m;
        var validatedList = new List<BookingComboDetailDto>();

        foreach (var req in requests)
        {
            if (!combosInDb.TryGetValue(req.ComboId, out var combo))
            {
                return (false, 0m, new(), $"Combo với ID {req.ComboId} không tồn tại.");
            }

            if (!combo.IsActive)
            {
                return (false, 0m, new(), $"Combo '{combo.Name}' hiện đã ngừng kinh doanh.");
            }

            // Luôn lấy giá từ server (Combo.Price), không tin giá client
            var serverUnitPrice = combo.Price;
            total += serverUnitPrice * req.Quantity;

            validatedList.Add(new BookingComboDetailDto
            {
                ComboId = combo.ComboId,
                ComboName = combo.Name,
                ImageUrl = combo.ImageUrl,
                Quantity = req.Quantity,
                UnitPrice = serverUnitPrice
            });
        }

        return (true, total, validatedList, null);
    }

    public async Task<(bool Success, string? Error)> SaveBookingCombosAsync(
        int bookingId,
        List<BookingComboItemRequest>? requests)
    {
        if (requests == null || requests.Count == 0)
        {
            return (true, null);
        }

        var (valid, _, validatedList, error) = await ValidateAndCalculateCombosAsync(requests);
        if (!valid)
        {
            return (false, error);
        }

        var booking = await _context.Bookings.FindAsync(bookingId);
        if (booking == null)
        {
            return (false, "Không tìm thấy đơn đặt vé.");
        }

        // Lưu vào bảng BookingCombos
        foreach (var item in validatedList)
        {
            _context.BookingCombos.Add(new BookingCombo
            {
                BookingId = bookingId,
                ComboId = item.ComboId,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice // Lưu giá tại thời điểm đặt để bảo toàn lịch sử
            });
        }

        booking.TotalAmount += validatedList.Sum(item => item.UnitPrice * item.Quantity);

        await _context.SaveChangesAsync();
        return (true, null);
    }

    public async Task<List<BookingComboDetailDto>> GetBookingCombosAsync(int bookingId)
    {
        return await _context.BookingCombos
            .Include(bc => bc.Combo)
            .AsNoTracking()
            .Where(bc => bc.BookingId == bookingId)
            .Select(bc => new BookingComboDetailDto
            {
                BookingComboId = bc.BookingComboId,
                ComboId = bc.ComboId,
                ComboName = bc.Combo.Name,
                ImageUrl = bc.Combo.ImageUrl,
                Quantity = bc.Quantity,
                UnitPrice = bc.UnitPrice
            })
            .ToListAsync();
    }

    public async Task<(bool Success, decimal TotalPrice, string? Error)> ValidateAndCalculateFoodsAsync(
        List<BookingFoodItemRequest>? requests)
    {
        if (requests == null || requests.Count == 0)
            return (true, 0m, null);

        if (requests.Any(x => x.Quantity <= 0 || x.Quantity > 50) ||
            requests.GroupBy(x => x.FoodItemId).Any(g => g.Count() > 1))
            return (false, 0m, "Số lượng món không hợp lệ.");

        var foodIds = requests.Select(x => x.FoodItemId).ToList();
        var foods = await _context.FoodItems
            .AsNoTracking()
            .Where(f => foodIds.Contains(f.FoodItemId) && f.IsActive)
            .ToDictionaryAsync(f => f.FoodItemId);

        if (foods.Count != foodIds.Count)
            return (false, 0m, "Một hoặc nhiều món đã ngừng kinh doanh.");

        var total = requests.Sum(item => foods[item.FoodItemId].Price * item.Quantity);
        return (true, total, null);
    }

    public async Task<(bool Success, string? Error)> SaveBookingFoodsAsync(
        int bookingId, List<BookingFoodItemRequest>? requests)
    {
        if (requests == null || requests.Count == 0)
            return (true, null);

        var validation = await ValidateAndCalculateFoodsAsync(requests);
        if (!validation.Success)
            return (false, validation.Error);

        var foodIds = requests.Select(x => x.FoodItemId).ToList();
        var foods = await _context.FoodItems
            .Where(f => foodIds.Contains(f.FoodItemId) && f.IsActive)
            .ToDictionaryAsync(f => f.FoodItemId);
        var booking = await _context.Bookings.FindAsync(bookingId);
        if (booking == null)
            return (false, "Không tìm thấy đơn đặt vé.");

        foreach (var item in requests)
        {
            var food = foods[item.FoodItemId];
            _context.BookingFoods.Add(new BookingFood
            {
                BookingId = bookingId,
                FoodItemId = food.FoodItemId,
                FoodName = food.Name,
                Quantity = item.Quantity,
                UnitPrice = food.Price
            });
        }

        booking.TotalAmount += validation.TotalPrice;
        await _context.SaveChangesAsync();
        return (true, null);
    }
}
