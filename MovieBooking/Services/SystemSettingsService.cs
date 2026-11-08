using System.Globalization;
using System.Net.Mail;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.DTOs;
using MovieBooking.Models;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Services;

/// <summary>Cấu hình vận hành toàn cục, lưu bền trong bảng SystemSettings (key-value).</summary>
public sealed class SystemSettingsService(MovieBookingContext context) : ISystemSettingsService
{
    private const string BrandNameKey = "brandName";
    private const string SeatHoldMinutesKey = "seatHoldMinutes";
    private const string DefaultTicketPriceKey = "defaultTicketPrice";
    private const string VipPriceMultiplierKey = "vipPriceMultiplier";
    private const string SupportEmailKey = "customerSupportEmail";
    private const string SupportPhoneKey = "customerSupportPhone";
    private const string AllowOnlineCancellationKey = "allowOnlineCancellation";
    private const string MaintenanceModeKey = "maintenanceMode";

    public async Task<SystemSettingsDto> GetAsync()
    {
        var values = await context.SystemSettings
            .AsNoTracking()
            .ToDictionaryAsync(row => row.SettingKey, row => row.SettingValue, StringComparer.OrdinalIgnoreCase);

        var defaults = new SystemSettingsDto();
        return new SystemSettingsDto
        {
            BrandName = ReadString(values, BrandNameKey, defaults.BrandName),
            SeatHoldMinutes = Math.Clamp(ReadInt(values, SeatHoldMinutesKey, defaults.SeatHoldMinutes), 1, 60),
            DefaultTicketPrice = Math.Clamp(ReadDecimal(values, DefaultTicketPriceKey, defaults.DefaultTicketPrice), 10000m, 99999999.99m),
            VipPriceMultiplier = Math.Clamp(ReadDecimal(values, VipPriceMultiplierKey, defaults.VipPriceMultiplier), 1m, 3m),
            CustomerSupportEmail = ReadString(values, SupportEmailKey, defaults.CustomerSupportEmail),
            CustomerSupportPhone = ReadString(values, SupportPhoneKey, defaults.CustomerSupportPhone),
            AllowOnlineCancellation = ReadBool(values, AllowOnlineCancellationKey, defaults.AllowOnlineCancellation),
            MaintenanceMode = ReadBool(values, MaintenanceModeKey, defaults.MaintenanceMode),
        };
    }

    public async Task<(SystemSettingsDto? Settings, string? Error)> UpdateAsync(SystemSettingsDto settings, int? updatedByUserId)
    {
        var normalized = new SystemSettingsDto
        {
            BrandName = settings.BrandName?.Trim() ?? string.Empty,
            SeatHoldMinutes = settings.SeatHoldMinutes,
            DefaultTicketPrice = settings.DefaultTicketPrice,
            VipPriceMultiplier = settings.VipPriceMultiplier,
            CustomerSupportEmail = settings.CustomerSupportEmail?.Trim() ?? string.Empty,
            CustomerSupportPhone = settings.CustomerSupportPhone?.Trim() ?? string.Empty,
            AllowOnlineCancellation = settings.AllowOnlineCancellation,
            MaintenanceMode = settings.MaintenanceMode,
        };

        var error = Validate(normalized);
        if (error != null) return (null, error);

        var entries = new (string Key, string Value, string Description)[]
        {
            (BrandNameKey, normalized.BrandName, "Tên thương hiệu hệ thống"),
            (SeatHoldMinutesKey, normalized.SeatHoldMinutes.ToString(CultureInfo.InvariantCulture), "Thời gian giữ ghế (phút)"),
            (DefaultTicketPriceKey, normalized.DefaultTicketPrice.ToString(CultureInfo.InvariantCulture), "Giá vé mặc định (VND)"),
            (VipPriceMultiplierKey, normalized.VipPriceMultiplier.ToString(CultureInfo.InvariantCulture), "Hệ số nhân giá ghế VIP"),
            (SupportEmailKey, normalized.CustomerSupportEmail, "Email chăm sóc khách hàng"),
            (SupportPhoneKey, normalized.CustomerSupportPhone, "Hotline tổng đài"),
            (AllowOnlineCancellationKey, normalized.AllowOnlineCancellation ? "true" : "false", "Cho phép hủy vé trực tuyến"),
            (MaintenanceModeKey, normalized.MaintenanceMode ? "true" : "false", "Chế độ bảo trì hệ thống"),
        };

        try
        {
            var keys = entries.Select(entry => entry.Key).ToList();
            var rows = await context.SystemSettings
                .Where(row => keys.Contains(row.SettingKey))
                .ToListAsync();
            var byKey = rows.ToDictionary(row => row.SettingKey, StringComparer.OrdinalIgnoreCase);
            var now = DateTime.Now;

            foreach (var (key, value, description) in entries)
            {
                if (byKey.TryGetValue(key, out var row))
                {
                    row.SettingValue = value;
                    row.Description = description;
                    row.UpdatedAt = now;
                    row.UpdatedByUserId = updatedByUserId;
                }
                else
                {
                    context.SystemSettings.Add(new SystemSetting
                    {
                        SettingKey = key,
                        SettingValue = value,
                        Description = description,
                        UpdatedAt = now,
                        UpdatedByUserId = updatedByUserId,
                    });
                }
            }

            await context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return (null, "Không thể lưu cấu hình lúc này. Vui lòng thử lại.");
        }

        return (normalized, null);
    }

    private static string? Validate(SystemSettingsDto settings)
    {
        if (settings.BrandName.Length == 0) return "Tên thương hiệu không được để trống.";
        if (settings.BrandName.Length > 100) return "Tên thương hiệu tối đa 100 ký tự.";
        if (settings.SeatHoldMinutes is < 1 or > 60) return "Thời gian giữ ghế phải từ 1 đến 60 phút.";
        if (settings.DefaultTicketPrice is < 10000m or > 99999999.99m) return "Giá vé mặc định phải từ 10.000 ₫ đến 99.999.999,99 ₫.";
        if (settings.VipPriceMultiplier is < 1m or > 3m) return "Hệ số ghế VIP phải từ 1 đến 3.";
        if (settings.CustomerSupportEmail.Length > 254 ||
            (settings.CustomerSupportEmail.Length > 0 && !MailAddress.TryCreate(settings.CustomerSupportEmail, out _)))
            return "Email chăm sóc khách hàng không hợp lệ.";
        if (settings.CustomerSupportPhone.Length > 30) return "Hotline tổng đài tối đa 30 ký tự.";
        return null;
    }

    private static string ReadString(IReadOnlyDictionary<string, string> values, string key, string fallback)
        => values.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value) ? value : fallback;

    private static int ReadInt(IReadOnlyDictionary<string, string> values, string key, int fallback)
        => values.TryGetValue(key, out var value) && int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed)
            ? parsed : fallback;

    private static decimal ReadDecimal(IReadOnlyDictionary<string, string> values, string key, decimal fallback)
        => values.TryGetValue(key, out var value) && decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed)
            ? parsed : fallback;

    private static bool ReadBool(IReadOnlyDictionary<string, string> values, string key, bool fallback)
        => values.TryGetValue(key, out var value) && bool.TryParse(value, out var parsed) ? parsed : fallback;
}