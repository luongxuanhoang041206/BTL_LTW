using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.DTOs;
using MovieBooking.Models;
using MovieBooking.Services;
using Xunit;

namespace MovieBooking.Tests;

public class FoodServiceTests
{
    private MovieBookingContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<MovieBookingContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        return new MovieBookingContext(options);
    }

    [Fact]
    public async Task Test_FoodItem_Create_Update_Toggle()
    {
        using var context = CreateInMemoryContext("Test_FoodItem_Create_Update_Toggle");
        var service = new FoodService(context);

        // 1. Create
        var form = new FoodItemFormDto
        {
            Name = "Bắp phô mai",
            Description = "Bắp lắc phô mai",
            Category = "Bắp rang",
            Price = 60000,
            IsActive = true
        };
        var created = await service.CreateFoodItemAsync(form);
        Assert.True(created.FoodItemId > 0);
        Assert.Equal("Bắp phô mai", created.Name);

        // 2. Update
        var updateForm = new FoodItemFormDto
        {
            FoodItemId = created.FoodItemId,
            Name = "Bắp phô mai đặc biệt",
            Category = "Bắp rang",
            Price = 65000,
            IsActive = true
        };
        var updateSuccess = await service.UpdateFoodItemAsync(created.FoodItemId, updateForm);
        Assert.True(updateSuccess);

        var updated = await service.GetFoodItemByIdAsync(created.FoodItemId);
        Assert.NotNull(updated);
        Assert.Equal("Bắp phô mai đặc biệt", updated.Name);
        Assert.Equal(65000, updated.Price);

        // 3. Toggle IsActive
        await service.ToggleFoodItemStatusAsync(created.FoodItemId);
        var toggled = await service.GetFoodItemByIdAsync(created.FoodItemId);
        Assert.False(toggled!.IsActive);
    }

    [Fact]
    public async Task Test_FoodItem_Cannot_Be_Deleted_If_In_Combo()
    {
        using var context = CreateInMemoryContext("Test_FoodItem_Cannot_Be_Deleted_If_In_Combo");
        var service = new FoodService(context);

        var food = new FoodItem { Name = "Coca", Category = "Nước ngọt", Price = 30000, IsActive = true };
        var combo = new Combo { Name = "Combo Test", Price = 50000, IsActive = true };
        context.FoodItems.Add(food);
        context.Combos.Add(combo);
        await context.SaveChangesAsync();

        context.ComboDetails.Add(new ComboDetail { ComboId = combo.ComboId, FoodItemId = food.FoodItemId, Quantity = 1 });
        await context.SaveChangesAsync();

        // Thử xóa món ăn đang nằm trong combo
        var (canDelete, reason) = await service.CanDeleteFoodItemAsync(food.FoodItemId);
        Assert.False(canDelete);
        Assert.NotNull(reason);

        var (success, error) = await service.DeleteFoodItemAsync(food.FoodItemId);
        Assert.False(success);
        Assert.Contains("Combo", error);
    }

    [Fact]
    public async Task Test_Combo_Validation_Duplicate_And_Invalid_Quantity()
    {
        using var context = CreateInMemoryContext("Test_Combo_Validation");
        var service = new FoodService(context);

        var f1 = new FoodItem { Name = "Món 1", Category = "Cat", Price = 20000, IsActive = true };
        var f2 = new FoodItem { Name = "Món 2", Category = "Cat", Price = 30000, IsActive = false }; // Đang inactive
        context.FoodItems.AddRange(f1, f2);
        await context.SaveChangesAsync();

        // 1. Số lượng <= 0
        var invalidQtyForm = new ComboFormDto
        {
            Name = "Combo 0",
            Price = 40000,
            IsActive = true,
            SelectedItems = new List<ComboItemInputDto>
            {
                new ComboItemInputDto { FoodItemId = f1.FoodItemId, Quantity = 0 }
            }
        };
        var (res1, _, err1) = await service.CreateComboAsync(invalidQtyForm);
        Assert.False(res1);
        Assert.Contains("lớn hơn 0", err1);

        // 2. Trùng món (Duplicate FoodItemId)
        var duplicateForm = new ComboFormDto
        {
            Name = "Combo Trùng",
            Price = 40000,
            IsActive = true,
            SelectedItems = new List<ComboItemInputDto>
            {
                new ComboItemInputDto { FoodItemId = f1.FoodItemId, Quantity = 1 },
                new ComboItemInputDto { FoodItemId = f1.FoodItemId, Quantity = 2 }
            }
        };
        var (res2, _, err2) = await service.CreateComboAsync(duplicateForm);
        Assert.False(res2);
        Assert.Contains("trùng món", err2);

        // 3. Món đang ngừng kinh doanh (Inactive)
        var inactiveForm = new ComboFormDto
        {
            Name = "Combo Inactive",
            Price = 40000,
            IsActive = true,
            SelectedItems = new List<ComboItemInputDto>
            {
                new ComboItemInputDto { FoodItemId = f2.FoodItemId, Quantity = 1 }
            }
        };
        var (res3, _, err3) = await service.CreateComboAsync(inactiveForm);
        Assert.False(res3);
        Assert.Contains("ngừng kinh doanh", err3);
    }

    [Fact]
    public async Task Test_Combo_Cannot_Be_Deleted_If_Has_Booking_Combos()
    {
        using var context = CreateInMemoryContext("Test_Combo_Booking_Protection");
        var service = new FoodService(context);

        var combo = new Combo { Name = "Combo Đã Đặt", Price = 90000, IsActive = true };
        context.Combos.Add(combo);
        await context.SaveChangesAsync();

        // Giả lập đã có booking combo
        context.BookingCombos.Add(new BookingCombo
        {
            BookingId = 1,
            ComboId = combo.ComboId,
            Quantity = 2,
            UnitPrice = 90000
        });
        await context.SaveChangesAsync();

        var (canDelete, reason) = await service.CanDeleteComboAsync(combo.ComboId);
        Assert.False(canDelete);
        Assert.Contains("lịch sử", reason);

        var (success, error) = await service.DeleteComboAsync(combo.ComboId);
        Assert.False(success);
    }

    [Fact]
    public async Task Test_ValidateAndCalculateCombos_Ignores_Client_Price()
    {
        using var context = CreateInMemoryContext("Test_Price_Safety");
        var service = new FoodService(context);

        var combo = new Combo { Name = "Combo Chuẩn Giá", Price = 100000, IsActive = true };
        context.Combos.Add(combo);
        await context.SaveChangesAsync();

        // Client gửi request đặt 3 combo
        var requests = new List<BookingComboItemRequest>
        {
            new BookingComboItemRequest { ComboId = combo.ComboId, Quantity = 3 }
        };

        var (success, totalComboPrice, validatedList, error) = await service.ValidateAndCalculateCombosAsync(requests);

        Assert.True(success);
        Assert.Null(error);
        // Server tự lấy 100.000 x 3 = 300.000
        Assert.Equal(300000m, totalComboPrice);
        Assert.Single(validatedList);
        Assert.Equal(100000m, validatedList[0].UnitPrice);
        Assert.Equal(3, validatedList[0].Quantity);
    }

    [Fact]
    public async Task Test_SaveBookingCombos_Preserves_Historical_Price()
    {
        using var context = CreateInMemoryContext("Test_Historical_Price");
        var service = new FoodService(context);

        var combo = new Combo { Name = "Combo Giá Gốc", Price = 80000, IsActive = true };
        context.Combos.Add(combo);
        await context.SaveChangesAsync();

        // Lưu đơn hàng với giá 80.000
        var requests = new List<BookingComboItemRequest>
        {
            new BookingComboItemRequest { ComboId = combo.ComboId, Quantity = 2 }
        };
        var (saveSuccess, _) = await service.SaveBookingCombosAsync(101, requests);
        Assert.True(saveSuccess);

        // Sau đó giá Combo trong hệ thống tăng lên 120.000
        combo.Price = 120000;
        await context.SaveChangesAsync();

        // Lấy lại danh sách BookingCombos của đơn 101
        var bookedCombos = await service.GetBookingCombosAsync(101);
        Assert.Single(bookedCombos);
        // UnitPrice của đơn hàng cũ vẫn phải là 80.000 (bảo toàn lịch sử)
        Assert.Equal(80000m, bookedCombos[0].UnitPrice);
        Assert.Equal(160000m, bookedCombos[0].SubTotal);
    }

    [Fact]
    public async Task Test_CinemaService_GetAll_And_Exists()
    {
        using var context = CreateInMemoryContext("Test_CinemaService");
        var cinemaService = new CinemaService(context);

        context.Cinemas.AddRange(
            new Cinema { Name = "Rạp Hà Nội", City = "Hà Nội", Address = "123 Phố Huế", Phone = "0123456" },
            new Cinema { Name = "Rạp Sài Gòn", City = "TPHCM", Address = "456 Lê Lợi", Phone = "0987654" }
        );
        await context.SaveChangesAsync();

        var allCinemas = await cinemaService.GetAllCinemasAsync();
        Assert.Equal(2, allCinemas.Count);

        var exists = await cinemaService.CinemaExistsAsync(allCinemas[0].CinemaId);
        Assert.True(exists);

        var notExists = await cinemaService.CinemaExistsAsync(9999);
        Assert.False(notExists);
    }
}
