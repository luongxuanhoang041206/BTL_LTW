using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.DTOs;
using MovieBooking.Models;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Services;

public sealed class WebsiteContentService(MovieBookingContext context) : IWebsiteContentService
{
    private const string ContentKey = "site";

    public async Task<AdminWebsiteContentDto> GetAdminContentAsync()
    {
        var row = await context.WebsiteContents
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.ContentKey == ContentKey);

        return new AdminWebsiteContentDto(
            row?.DraftJson ?? "{}",
            row?.PublishedJson ?? "{}",
            row?.UpdatedAt,
            row?.PublishedAt);
    }

    public async Task<string?> SaveDraftAsync(JsonElement content, int? updatedByUserId)
    {
        var json = content.GetRawText();
        if (json.Length > 100_000) return "Nội dung vượt quá giới hạn.";
        if (content.ValueKind != JsonValueKind.Object)
            return "Nội dung website phải là một đối tượng JSON.";

        var validationError = ValidateContent(content);
        if (validationError != null) return validationError;

        var row = await context.WebsiteContents
            .SingleOrDefaultAsync(x => x.ContentKey == ContentKey);
        if (row == null)
        {
            row = new WebsiteContent { ContentKey = ContentKey };
            context.WebsiteContents.Add(row);
        }

        row.DraftJson = json;
        row.UpdatedAt = DateTime.UtcNow;
        row.UpdatedByUserId = updatedByUserId;
        await context.SaveChangesAsync();
        return null;
    }

    public async Task<bool> PublishAsync()
    {
        var row = await context.WebsiteContents
            .SingleOrDefaultAsync(x => x.ContentKey == ContentKey);
        if (row == null) return false;

        row.PublishedJson = row.DraftJson;
        row.PublishedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
        return true;
    }

    public async Task<JsonElement?> GetPublishedContentAsync()
    {
        var json = await context.WebsiteContents
            .AsNoTracking()
            .Where(x => x.ContentKey == ContentKey)
            .Select(x => x.PublishedJson)
            .SingleOrDefaultAsync();

        if (string.IsNullOrEmpty(json)) return null;

        using var document = JsonDocument.Parse(json);
        return document.RootElement.Clone();
    }

    private static string? ValidateContent(JsonElement content)
    {
        if (content.TryGetProperty("banner", out var banner) && banner.ValueKind == JsonValueKind.Object)
        {
            foreach (var key in new[] { "title", "description", "image", "ctaText", "ctaLink" })
                if (banner.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.String && value.GetString()!.Length > 2000)
                    return $"Trường banner '{key}' vượt quá giới hạn.";
            if (banner.TryGetProperty("order", out var order) && (!order.TryGetInt32(out var number) || number < 1 || number > 1000))
                return "Thứ tự banner phải từ 1 đến 1000.";
        }
        if (content.TryGetProperty("sections", out var sections) && sections.ValueKind == JsonValueKind.Array)
            foreach (var section in sections.EnumerateArray())
                if (section.ValueKind != JsonValueKind.Object || !section.TryGetProperty("key", out var key) || key.GetString() is not ("nowShowing" or "trailers"))
                    return "Khu vực website không hợp lệ.";
        if (content.TryGetProperty("announcements", out var announcements) && announcements.ValueKind == JsonValueKind.Array)
            foreach (var item in announcements.EnumerateArray())
            {
                if (item.ValueKind != JsonValueKind.Object) return "Thông báo không hợp lệ.";
                if (item.TryGetProperty("type", out var type) && type.GetString() is not ("normal" or "emergency")) return "Loại thông báo không hợp lệ.";
                if (item.TryGetProperty("text", out var text) && text.ValueKind == JsonValueKind.String && text.GetString()!.Length > 500) return "Thông báo vượt quá 500 ký tự.";
            }
        return null;
    }
}
