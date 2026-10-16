using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace MovieBooking.DTOs;

// =========================================================
// FOOD ITEM DTOS
// =========================================================

public class FoodItemDto
{
    public int FoodItemId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public decimal Price { get; set; }
    public string Category { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class FoodItemFormDto
{
    public int FoodItemId { get; set; }

    [Required(ErrorMessage = "Tên món ăn/đồ uống không được để trống.")]
    [StringLength(150, ErrorMessage = "Tên không được vượt quá 150 ký tự.")]
    [Display(Name = "Tên món")]
    public string Name { get; set; } = string.Empty;

    [StringLength(500, ErrorMessage = "Mô tả không được vượt quá 500 ký tự.")]
    [Display(Name = "Mô tả")]
    public string? Description { get; set; }

    [StringLength(500, ErrorMessage = "Đường dẫn ảnh không được vượt quá 500 ký tự.")]
    [Display(Name = "Link hình ảnh")]
    public string? ImageUrl { get; set; }

    [Required(ErrorMessage = "Vui lòng nhập giá.")]
    [Range(0, 10000000, ErrorMessage = "Giá phải lớn hơn hoặc bằng 0.")]
    [Display(Name = "Giá bán (VNĐ)")]
    public decimal Price { get; set; }

    [Required(ErrorMessage = "Vui lòng chọn danh mục.")]
    [StringLength(50, ErrorMessage = "Danh mục không được vượt quá 50 ký tự.")]
    [Display(Name = "Danh mục")]
    public string Category { get; set; } = "Bắp rang"; // Bắp rang, Nước ngọt, Đồ ăn vặt, Khác...

    [Display(Name = "Đang kinh doanh")]
    public bool IsActive { get; set; } = true;
}

// =========================================================
// COMBO DTOS
// =========================================================

public class ComboDetailDto
{
    public int FoodItemId { get; set; }
    public string FoodItemName { get; set; } = string.Empty;
    public string? FoodItemImageUrl { get; set; }
    public decimal FoodItemPrice { get; set; }
    public int Quantity { get; set; }
}

public class ComboDto
{
    public int ComboId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public decimal Price { get; set; }
    public bool IsActive { get; set; }
    public List<ComboDetailDto> Items { get; set; } = new();
}

public class ComboItemInputDto
{
    [Required(ErrorMessage = "Vui lòng chọn món.")]
    public int FoodItemId { get; set; }

    [Required(ErrorMessage = "Vui lòng nhập số lượng.")]
    [Range(1, 100, ErrorMessage = "Số lượng mỗi món trong combo phải từ 1 đến 100.")]
    public int Quantity { get; set; } = 1;
}

public class ComboFormDto
{
    public int ComboId { get; set; }

    [Required(ErrorMessage = "Tên combo không được để trống.")]
    [StringLength(150, ErrorMessage = "Tên combo không được vượt quá 150 ký tự.")]
    [Display(Name = "Tên Combo")]
    public string Name { get; set; } = string.Empty;

    [StringLength(500, ErrorMessage = "Mô tả không được vượt quá 500 ký tự.")]
    [Display(Name = "Mô tả")]
    public string? Description { get; set; }

    [StringLength(500, ErrorMessage = "Đường dẫn ảnh không được vượt quá 500 ký tự.")]
    [Display(Name = "Link hình ảnh")]
    public string? ImageUrl { get; set; }

    [Required(ErrorMessage = "Vui lòng nhập giá bán của combo.")]
    [Range(0, 10000000, ErrorMessage = "Giá bán phải lớn hơn hoặc bằng 0.")]
    [Display(Name = "Giá bán combo (VNĐ)")]
    public decimal Price { get; set; }

    [Display(Name = "Đang áp dụng")]
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Danh sách các thành phần (FoodItemId và Quantity).
    /// </summary>
    public List<ComboItemInputDto> SelectedItems { get; set; } = new();
}

// =========================================================
// BOOKING COMBO DTOS
// =========================================================

public class BookingComboItemRequest
{
    [Required]
    public int ComboId { get; set; }

    [Range(1, 50, ErrorMessage = "Số lượng combo phải từ 1 đến 50.")]
    public int Quantity { get; set; }
}

public class BookingComboDetailDto
{
    public int BookingComboId { get; set; }
    public int ComboId { get; set; }
    public string ComboName { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal SubTotal => Quantity * UnitPrice;
}
