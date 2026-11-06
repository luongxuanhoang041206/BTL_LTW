using MovieBooking.DTOs;

namespace MovieBooking.Services.Interfaces;

public interface IPromotionService
{
    Task<List<AdminPromotionDto>> GetPromotionsAsync();
    Task<PaginationResponseDto<AdminPromotionDto>> GetPromotionsPagedAsync(AdminPromotionQueryDto query);
    Task<AdminPromotionSummaryDto> GetPromotionSummaryAsync();
    Task<(bool Success, bool Conflict, string? Error, int? Id)> CreatePromotionAsync(PromotionFormDto request);
    Task<(bool Success, bool NotFound, string? Error)> UpdatePromotionAsync(int id, PromotionFormDto request);
    Task<(bool Found, bool Status)> TogglePromotionAsync(int id);
    Task<(bool Found, bool Archived)> DeletePromotionAsync(int id);
}
