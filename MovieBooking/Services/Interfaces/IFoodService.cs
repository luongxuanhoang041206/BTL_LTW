using System.Collections.Generic;
using System.Threading.Tasks;
using MovieBooking.DTOs;
using MovieBooking.Models;

namespace MovieBooking.Services.Interfaces;

public interface IFoodService
{
    // =========================================================
    // ADMIN: FOOD ITEMS
    // =========================================================
    Task<List<FoodItem>> GetAllFoodItemsAsync(string? category = null, bool? isActive = null);
    Task<FoodItem?> GetFoodItemByIdAsync(int id);
    Task<FoodItem> CreateFoodItemAsync(FoodItemFormDto model);
    Task<bool> UpdateFoodItemAsync(int id, FoodItemFormDto model);
    Task<bool> ToggleFoodItemStatusAsync(int id);
    Task<(bool CanDelete, string? Reason)> CanDeleteFoodItemAsync(int id);
    Task<(bool Success, string? Error)> DeleteFoodItemAsync(int id);
    Task<List<string>> GetAllCategoriesAsync();

    // =========================================================
    // ADMIN: COMBOS
    // =========================================================
    Task<List<ComboDto>> GetAllCombosAsync(bool? isActive = null);
    Task<ComboDto?> GetComboDtoByIdAsync(int id);
    Task<Combo?> GetComboByIdAsync(int id);
    Task<(bool Success, Combo? Combo, string? Error)> CreateComboAsync(ComboFormDto model);
    Task<(bool Success, string? Error)> UpdateComboAsync(int id, ComboFormDto model);
    Task<bool> ToggleComboStatusAsync(int id);
    Task<(bool CanDelete, string? Reason)> CanDeleteComboAsync(int id);
    Task<(bool Success, string? Error)> DeleteComboAsync(int id);

    // =========================================================
    // CLIENT API
    // =========================================================
    Task<List<FoodItemDto>> GetActiveFoodItemsAsync(string? category = null);
    Task<List<ComboDto>> GetActiveCombosAsync();
    Task<ComboDto?> GetActiveComboByIdAsync(int id);

    // =========================================================
    // BOOKING INTEGRATION
    // =========================================================
    Task<(bool Success, decimal TotalComboPrice, List<BookingComboDetailDto> ValidatedCombos, string? Error)>
        ValidateAndCalculateCombosAsync(List<BookingComboItemRequest>? requests);

    Task<(bool Success, string? Error)> SaveBookingCombosAsync(
        int bookingId,
        List<BookingComboItemRequest>? requests);

    Task<List<BookingComboDetailDto>> GetBookingCombosAsync(int bookingId);
}
