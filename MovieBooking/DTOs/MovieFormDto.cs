using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace MovieBooking.DTOs;

public class MovieFormDto
{
    public int MovieId { get; set; }

    [Required(ErrorMessage = "Vui lòng nhập tên phim")]
    [StringLength(200, ErrorMessage = "Tên phim không được vượt quá 200 ký tự")]
    [Display(Name = "Tên phim")]
    public string Title { get; set; } = string.Empty;

    [Display(Name = "Mô tả")]
    public string? Description { get; set; }

    [Range(1, 500, ErrorMessage = "Thời lượng phải từ 1 đến 500 phút")]
    [Display(Name = "Thời lượng (phút)")]
    public int Duration { get; set; }

    [Display(Name = "Ngày khởi chiếu")]
    public DateOnly? ReleaseDate { get; set; }

    [Display(Name = "Ngày kết thúc")]
    public DateOnly? EndDate { get; set; }

    [Url(ErrorMessage = "Poster phải là URL hợp lệ")]
    [Display(Name = "URL poster")]
    public string? PosterUrl { get; set; }

    [Url(ErrorMessage = "Trailer phải là URL hợp lệ")]
    [Display(Name = "URL trailer")]
    public string? TrailerUrl { get; set; }

    [StringLength(100, ErrorMessage = "Tên đạo diễn không vượt quá 100 ký tự")]
    [Display(Name = "Đạo diễn")]
    public string? Director { get; set; }

    [StringLength(500, ErrorMessage = "Danh sách diễn viên không vượt quá 500 ký tự")]
    [Display(Name = "Diễn viên")]
    public string? Actors { get; set; }

    [StringLength(50, ErrorMessage = "Ngôn ngữ không vượt quá 50 ký tự")]
    [Display(Name = "Ngôn ngữ")]
    public string? Language { get; set; }

    [StringLength(10, ErrorMessage = "Độ tuổi không vượt quá 10 ký tự")]
    [Display(Name = "Độ tuổi")]
    public string? AgeRating { get; set; }

    [Required(ErrorMessage = "Vui lòng chọn trạng thái phim")]
    [Display(Name = "Trạng thái")]
    public string Status { get; set; } = "Coming Soon";

    [Display(Name = "Thể loại")]
    public List<int> GenreIds { get; set; } = new();
}
