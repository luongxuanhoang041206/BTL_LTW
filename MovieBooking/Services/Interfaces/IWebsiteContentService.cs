using System.Text.Json;
using MovieBooking.DTOs;

namespace MovieBooking.Services.Interfaces;

public interface IWebsiteContentService
{
    Task<AdminWebsiteContentDto> GetAdminContentAsync();

    /// <returns>An error message when the submitted draft is invalid; otherwise null.</returns>
    Task<string?> SaveDraftAsync(JsonElement content, int? updatedByUserId);

    Task<bool> PublishAsync();

    Task<JsonElement?> GetPublishedContentAsync();
}
