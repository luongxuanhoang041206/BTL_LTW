using MovieBooking.DTOs;
using MovieBooking.DTOs.Promotion;
using MovieBooking.Models;

namespace MovieBooking.Services.Interfaces;

public interface IPromotionService
{
    // ----- Admin -----
    Task<List<AdminPromotionDto>> GetPromotionsAsync();
    Task<PaginationResponseDto<AdminPromotionDto>> GetPromotionsPagedAsync(AdminPromotionQueryDto query);
    Task<AdminPromotionSummaryDto> GetPromotionSummaryAsync();
    Task<PromotionDetailDto?> GetPromotionByIdAsync(int id);
    Task<List<PromotionUsageDto>> GetPromotionUsageAsync(int id);
    Task<(bool Success, bool Conflict, string? Error, int? Id)> CreatePromotionAsync(PromotionFormDto request);
    Task<(bool Success, bool NotFound, string? Error)> UpdatePromotionAsync(int id, PromotionFormDto request);
    Task<(bool Found, bool Status)> TogglePromotionAsync(int id);
    Task<(bool Found, bool Archived)> DeletePromotionAsync(int id);

    // ----- Customer / calculation -----
    Task<List<AvailablePromotionDto>> GetAvailablePromotionsAsync(int userId);
    Task<PromotionCalculationResultDto> PreviewPromotionAsync(PromotionPreviewRequestDto request, int userId);
    Task<PromotionCalculationResultDto> CalculatePromotionAsync(
        string code,
        int userId,
        decimal ticketsAmount,
        decimal foodsAmount,
        decimal combosAmount);

    // ----- Redemption / usage lifecycle (chạy trong transaction của caller) -----
    Task ReserveRedemptionAsync(int bookingId, int userId, Promotion promotion, DateTime expiresAt);
    Task RedeemForBookingAsync(int bookingId);
    Task ReleaseForBookingAsync(int bookingId);
    Task<int> ReleaseExpiredRedemptionsAsync();
}