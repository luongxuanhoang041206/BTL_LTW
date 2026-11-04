using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using MovieBooking.DTOs;
using MovieBooking.Models;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Services;

public class BookingService : IBookingService
{
    private readonly MovieBookingContext _context;
    private const int HoldMinutes = 10;

    public BookingService(MovieBookingContext context)
    {
        _context = context;
    }

    // -----------------------------------------------------------------------
    // SHOWTIME SELECTION
    // -----------------------------------------------------------------------

    public async Task<ShowtimeSelectionViewModel?> GetShowtimeSelectionAsync(int movieId, int? cinemaId = null, DateOnly? date = null, string? city = null, string? roomType = null)
    {
        var movie = await _context.Movies
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.MovieId == movieId);

        if (movie == null) return null;

        var now = DateTime.Now;
        var today = DateOnly.FromDateTime(now);
        var currentTime = TimeOnly.FromDateTime(now);

        var roomTypes = await _context.Showtimes.AsNoTracking()
            .Where(s => s.MovieId == movieId && s.Status == "Active"
                && (s.ShowDate > today || (s.ShowDate == today && s.EndTime > currentTime)))
            .Select(s => s.Room.RoomType)
            .Distinct()
            .OrderBy(type => type)
            .ToListAsync();

        var query = _context.Showtimes
            .Include(s => s.Room)
                .ThenInclude(r => r.Cinema)
            .Include(s => s.ShowtimeSeats)
            .Where(s => s.MovieId == movieId
                       && (s.ShowDate > today || (s.ShowDate == today && s.EndTime > currentTime))
                     && s.Status == "Active");

        // Lọc theo rạp nếu được chỉ định
        if (cinemaId.HasValue)
        {
            query = query.Where(s => s.Room.CinemaId == cinemaId.Value);
        }

        if (date.HasValue) query = query.Where(s => s.ShowDate == date.Value);
        if (!string.IsNullOrWhiteSpace(city)) query = query.Where(s => s.Room.Cinema.City == city);
        if (!string.IsNullOrWhiteSpace(roomType)) query = query.Where(s => s.Room.RoomType == roomType);

        var showtimes = await query
            .AsNoTracking()
            .OrderBy(s => s.ShowDate)
            .ThenBy(s => s.Room.Cinema.Name)
            .ThenBy(s => s.StartTime)
            .ToListAsync();

        var dayGroups = showtimes
            .GroupBy(s => s.ShowDate)
            .Select(g => new ShowtimeDayGroup
            {
                ShowDate = g.Key,
                Showtimes = g.Select(s => new ShowtimeItemViewModel
                {
                    ShowtimeId    = s.ShowtimeId,
                      RoomId        = s.RoomId,
                      CinemaId      = s.Room.CinemaId,
                    StartTime     = s.StartTime,
                    EndTime       = s.EndTime,
                    CinemaName    = s.Room.Cinema.Name,
                      CinemaAddress = s.Room.Cinema.Address ?? string.Empty,
                      City          = s.Room.Cinema.City ?? string.Empty,
                    RoomName      = s.Room.RoomName,
                    RoomType      = s.Room.RoomType,
                    Price         = s.Price,
                      AvailableSeats = s.ShowtimeSeats.Count(ss => ss.Status == "Available"
                          || (ss.Status == "Holding" && ss.HoldExpiresAt != null && ss.HoldExpiresAt < now))
                }).ToList()
            })
            .ToList();

        return new ShowtimeSelectionViewModel
        {
            MovieId    = movie.MovieId,
            MovieTitle = movie.Title,
            PosterUrl  = movie.PosterUrl,
            Duration   = movie.Duration,
            AgeRating  = movie.AgeRating,
            RoomTypes  = roomTypes,
            DayGroups  = dayGroups
        };
    }

    public async Task<List<CinemaItemViewModel>> GetCinemasForMovieAsync(int movieId)
    {
        var now = DateTime.Now;
        var today = DateOnly.FromDateTime(now);
        var currentTime = TimeOnly.FromDateTime(now);

        var cinemas = await _context.Showtimes
            .Include(s => s.Room)
                .ThenInclude(r => r.Cinema)
            .Where(s => s.MovieId == movieId
                       && (s.ShowDate > today || (s.ShowDate == today && s.EndTime > currentTime))
                     && s.Status == "Active")
            .GroupBy(s => s.Room.Cinema)
            .Select(g => new CinemaItemViewModel
            {
                CinemaId = g.Key.CinemaId,
                Name = g.Key.Name,
                Address = g.Key.Address ?? string.Empty,
                  City = g.Key.City ?? string.Empty,
                ShowtimeCount = g.Count()
            })
            .OrderBy(c => c.Name)
            .AsNoTracking()
            .ToListAsync();

        return cinemas;
    }

    // -----------------------------------------------------------------------
    // SEAT MAP
    // -----------------------------------------------------------------------

    public async Task ReleaseExpiredHoldsAsync(int showtimeId)
    {
        var now = DateTime.Now;

        var expiredSeats = await _context.ShowtimeSeats
            .Where(ss => ss.ShowtimeId == showtimeId
                      && ss.Status == "Holding"
                      && ss.HoldExpiresAt != null
                      && ss.HoldExpiresAt < now)
            .ToListAsync();

        if (expiredSeats.Count == 0) return;

        foreach (var seat in expiredSeats)
        {
            seat.Status          = "Available";
            seat.HoldExpiresAt   = null;
            seat.LockedByUserId  = null;
        }
        await _context.SaveChangesAsync();
    }

    public async Task<SeatMapViewModel?> GetSeatMapAsync(int showtimeId, int currentUserId)
    {
        var showtime = await _context.Showtimes
            .Include(s => s.Movie)
            .Include(s => s.Room)
                .ThenInclude(r => r.Cinema)
            .Include(s => s.ShowtimeSeats)
                .ThenInclude(ss => ss.Seat)
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.ShowtimeId == showtimeId);

        if (showtime == null) return null;
        if (showtime.Status != "Active") return null;

        // Build seat item list
        var seatItems = showtime.ShowtimeSeats
            .Where(ss => ss.Seat.IsActive)
            .Select(ss => new SeatItemViewModel
            {
                ShowtimeSeatId      = ss.ShowtimeSeatId,
                SeatId              = ss.SeatId,
                SeatRow             = ss.Seat.SeatRow,
                SeatNumber          = ss.Seat.SeatNumber,
                SeatType            = ss.Seat.SeatType,
                Status              = ss.Status,
                IsHeldByCurrentUser = ss.Status == "Holding" && ss.LockedByUserId == currentUserId
            })
            .OrderBy(s => s.SeatRow)
            .ThenBy(s => s.SeatNumber)
            .ToList();

        // Group by row
        var rows = seatItems
            .GroupBy(s => s.SeatRow)
            .OrderBy(g => g.Key)
            .Select(g => new SeatRowViewModel
            {
                RowLabel = g.Key,
                Seats    = g.OrderBy(s => s.SeatNumber).ToList()
            })
            .ToList();

        return new SeatMapViewModel
        {
            ShowtimeId   = showtime.ShowtimeId,
            MovieTitle   = showtime.Movie.Title,
            PosterUrl    = showtime.Movie.PosterUrl,
            ShowDate     = showtime.ShowDate,
            StartTime    = showtime.StartTime,
            EndTime      = showtime.EndTime,
            CinemaName   = showtime.Room.Cinema.Name,
            RoomName     = showtime.Room.RoomName,
            RoomType      = showtime.Room.RoomType,
            PricePerSeat = showtime.Price,
            PricePerSeatVip = Math.Round(showtime.Price * (showtime.VipMultiplier > 0 ? showtime.VipMultiplier : 1.2m), 0),
            Rows         = rows
        };
    }

    // -----------------------------------------------------------------------
    // HOLD SEATS
    // -----------------------------------------------------------------------

    public async Task<(bool Success, string? Error)> HoldSeatsAsync(
        int showtimeId, List<int> seatIds, int userId)
    {
        if (seatIds == null || seatIds.Count == 0)
            return (false, "Vui lòng chọn ít nhất một ghế.");

        if (seatIds.Count > 8)
            return (false, "Chỉ được chọn tối đa 8 ghế mỗi lần đặt.");

        // 1. Giải phóng expired holds
        await ReleaseExpiredHoldsAsync(showtimeId);

        await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var showtimeIsActive = await _context.Showtimes
                .AnyAsync(s => s.ShowtimeId == showtimeId && s.Status == "Active");
            if (!showtimeIsActive)
                return (false, "Suất chiếu không tồn tại hoặc đã ngừng nhận đặt vé.");

            // Re-read from the database; client seat data is never trusted.
            var seats = await _context.ShowtimeSeats
                .Where(ss => ss.ShowtimeId == showtimeId && seatIds.Contains(ss.SeatId))
                .ToListAsync();

            if (seats.Count != seatIds.Count)
                return (false, "Một hoặc nhiều ghế không hợp lệ.");

            var unavailable = seats.Where(s =>
                s.Status != "Available" &&
                !(s.Status == "Holding" && s.LockedByUserId == userId &&
                  s.HoldExpiresAt != null && s.HoldExpiresAt >= DateTime.Now)).ToList();
            if (unavailable.Count > 0)
                return (false, "Một hoặc nhiều ghế vừa được người khác chọn. Vui lòng chọn lại.");

            var expiresAt = DateTime.Now.AddMinutes(HoldMinutes);
            foreach (var seat in seats)
            {
                seat.Status = "Holding";
                seat.LockedByUserId = userId;
                seat.HoldExpiresAt = expiresAt;
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return (true, null);
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync();
            return (false, "Không thể giữ ghế. Vui lòng thử lại.");
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            return (false, "Không thể giữ ghế lúc này. Vui lòng thử lại.");
        }
    }

    // -----------------------------------------------------------------------
    // CONFIRM BOOKING
    // -----------------------------------------------------------------------

    public async Task<(bool Success, int? BookingId, string? Error)> ConfirmBookingAsync(
        int showtimeId,
        List<int> showtimeSeatIds,
        int userId,
        string? promoCode)
    {
        if (showtimeSeatIds == null || showtimeSeatIds.Count == 0)
            return (false, null, "Không có ghế nào được chọn.");

        var now = DateTime.Now;

        var transaction = _context.Database.CurrentTransaction;
        var ownsTransaction = transaction == null;
        transaction ??= await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            // Read the status in the same transaction as seat and booking writes.
            var showtime = await _context.Showtimes
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.ShowtimeId == showtimeId);
            if (showtime == null || showtime.Status != "Active")
            {
                if (ownsTransaction) await transaction.RollbackAsync();
                return (false, null, showtime == null
                    ? "Suất chiếu không tồn tại."
                    : "Suất chiếu đã ngừng nhận đặt vé.");
            }

            // 1. Re-read và lock ShowtimeSeats — Include Seat để lấy SeatType tính giá VIP
            var seats = await _context.ShowtimeSeats
                .Include(ss => ss.Seat)
                .Where(ss => ss.ShowtimeId == showtimeId && showtimeSeatIds.Contains(ss.ShowtimeSeatId))
                .ToListAsync();

            if (seats.Count != showtimeSeatIds.Count)
            {
                if (ownsTransaction) await transaction.RollbackAsync();
                return (false, null, "Dữ liệu ghế không hợp lệ.");
            }

            // 2. Kiểm tra tất cả còn Holding + đúng user + chưa hết hạn
            foreach (var seat in seats)
            {
                if (seat.Status != "Holding"
                    || seat.LockedByUserId != userId
                    || seat.HoldExpiresAt == null
                    || seat.HoldExpiresAt < now)
                {
                    if (ownsTransaction) await transaction.RollbackAsync();
                    return (false, null, "Thời gian giữ ghế đã hết. Vui lòng chọn lại.");
                }
            }

            // 3. Validate & apply promo
            int? promotionId = null;
            decimal discountPercent = 0;

            if (!string.IsNullOrWhiteSpace(promoCode))
            {
                var (valid, promo, _) = await ValidatePromoAsync(promoCode);
                if (valid && promo != null)
                {
                    promotionId     = promo.PromotionId;
                    discountPercent = promo.DiscountPercent;
                }
            }

            // 4. Tính tổng tiền theo loại ghế (Thường / VIP)
            decimal totalRaw = 0;
            var vipMultiplier = showtime.VipMultiplier > 0 ? showtime.VipMultiplier : 1.2m;

            foreach (var ss in seats)
            {
                var seatPrice = (ss.Seat?.SeatType == "VIP")
                    ? Math.Round(showtime.Price * vipMultiplier, 0)
                    : showtime.Price;
                totalRaw += seatPrice;
            }

            // Áp dụng khuyến mãi nếu có
            var totalAmount = discountPercent > 0
                ? totalRaw - Math.Round(totalRaw * discountPercent / 100m, 0)
                : totalRaw;
            // 5. Tạo Booking
            var booking = new Booking
            {
                UserId      = userId,
                ShowtimeId  = showtimeId,
                PromotionId = promotionId,
                BookingDate = now,
                TotalAmount = totalAmount,
                Status      = "Pending"
            };
            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync(); // Cần BookingId

            // 6. Tạo BookingDetail cho mỗi ghế
            foreach (var seat in seats)
            {
                _context.BookingDetails.Add(new BookingDetail
                {
                    BookingId      = booking.BookingId,
                    ShowtimeSeatId = seat.ShowtimeSeatId,
                    Price          = seat.Seat?.SeatType == "VIP"
                        ? Math.Round(showtime.Price * vipMultiplier, 0)
                        : showtime.Price
                });
                // Keep the seat held while payment is pending. The payment webhook
                // converts it to Booked after confirming the exact transfer.
            }

            await _context.SaveChangesAsync();
            if (ownsTransaction) await transaction.CommitAsync();

            return (true, booking.BookingId, null);
        }
        catch (DbUpdateException ex) when (
            ex.InnerException?.Message.Contains("UQ_BookingDetail_Seat") == true
            || ex.InnerException?.Message.Contains("unique") == true)
        {
            if (ownsTransaction) await transaction.RollbackAsync();
            return (false, null, "Một hoặc nhiều ghế vừa được đặt bởi người khác. Vui lòng chọn lại.");
        }
        catch (Exception)
        {
            if (ownsTransaction) await transaction.RollbackAsync();
            return (false, null, "Đã xảy ra lỗi. Vui lòng thử lại.");
        }
        finally
        {
            if (ownsTransaction) await transaction.DisposeAsync();
        }
    }

    // -----------------------------------------------------------------------
    // PROMO / TOTAL
    // -----------------------------------------------------------------------

    public async Task<(bool Valid, Promotion? Promo, string? Error)> ValidatePromoAsync(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
            return (false, null, "Mã giảm giá không được để trống.");

        var today = DateOnly.FromDateTime(DateTime.Today);

        var promo = await _context.Promotions
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Code == code.Trim().ToUpper());

        if (promo == null)
            return (false, null, "Mã giảm giá không tồn tại.");

        if (!promo.Status)
            return (false, null, "Mã giảm giá đã bị vô hiệu hóa.");

        if (today < promo.StartDate)
            return (false, null, $"Mã giảm giá chưa có hiệu lực (từ {promo.StartDate:dd/MM/yyyy}).");

        if (today > promo.EndDate)
            return (false, null, $"Mã giảm giá đã hết hạn (hết ngày {promo.EndDate:dd/MM/yyyy}).");

        return (true, promo, null);
    }

    public decimal CalculateTotal(decimal unitPrice, int seatCount, decimal discountPercent)
    {
        var subTotal  = unitPrice * seatCount;
        var discount  = Math.Round(subTotal * discountPercent / 100, 0);
        return subTotal - discount;
    }

    // -----------------------------------------------------------------------
    // HISTORY / DETAIL
    // -----------------------------------------------------------------------

    public async Task<List<BookingHistoryViewModel>> GetUserBookingsAsync(int userId)
    {
        var bookings = await _context.Bookings
            .Include(b => b.Showtime)
                .ThenInclude(s => s.Movie)
            .Include(b => b.Showtime)
                .ThenInclude(s => s.Room)
                    .ThenInclude(r => r.Cinema)
            .Include(b => b.BookingDetails)
            .Include(b => b.Payments)
            .Where(b => b.UserId == userId)
            .AsNoTracking()
            .OrderByDescending(b => b.BookingDate)
            .ToListAsync();

        return bookings.Select(b => new BookingHistoryViewModel
        {
            BookingId    = b.BookingId,
            MovieTitle   = b.Showtime.Movie.Title,
            PosterUrl    = b.Showtime.Movie.PosterUrl,
            ShowDate     = b.Showtime.ShowDate,
            StartTime    = b.Showtime.StartTime,
            CinemaName   = b.Showtime.Room.Cinema.Name,
            SeatCount    = b.BookingDetails.Count,
            TotalAmount  = b.TotalAmount,
            Status       = b.Status,
            BookingDate  = b.BookingDate,
            PaymentStatus = b.Payments
                             .OrderByDescending(p => p.PaymentId)
                             .FirstOrDefault()?.PaymentStatus
        }).ToList();
    }

    public async Task<BookingDetailViewModel?> GetBookingDetailAsync(int bookingId, int userId)
    {
        var booking = await _context.Bookings
            .Include(b => b.Showtime)
                .ThenInclude(s => s.Movie)
            .Include(b => b.Showtime)
                .ThenInclude(s => s.Room)
                    .ThenInclude(r => r.Cinema)
            .Include(b => b.BookingDetails)
                .ThenInclude(bd => bd.ShowtimeSeat)
                    .ThenInclude(ss => ss.Seat)
            .Include(b => b.BookingCombos)
                .ThenInclude(bc => bc.Combo)
            .Include(b => b.BookingFoods)
            .Include(b => b.Payments)
            .Include(b => b.Promotion)
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.BookingId == bookingId && b.UserId == userId);

        if (booking == null) return null;

        var latestPayment = booking.Payments
            .OrderByDescending(p => p.PaymentId)
            .FirstOrDefault();

        var seats = booking.BookingDetails
            .Select(bd => new BookingDetailSeatInfo
            {
                SeatLabel = $"{bd.ShowtimeSeat.Seat.SeatRow}{bd.ShowtimeSeat.Seat.SeatNumber}",
                SeatType  = bd.ShowtimeSeat.Seat.SeatType,
                Price     = bd.Price
            })
            .OrderBy(s => s.SeatLabel)
            .ToList();

        if ((booking.Status == "Paid" || booking.Status == "Confirmed") && string.IsNullOrEmpty(booking.TicketCode))
        {
            var trackedBooking = await _context.Bookings.FindAsync(booking.BookingId);
            if (trackedBooking != null)
            {
                trackedBooking.TicketCode = $"TK-{booking.BookingId:D6}-{DateTime.UtcNow:yyyyMMdd}";
                await _context.SaveChangesAsync();
                booking.TicketCode = trackedBooking.TicketCode;
            }
        }

        var subTotal = seats.Sum(s => s.Price);

        return new BookingDetailViewModel
        {
            BookingId      = booking.BookingId,
            MovieTitle     = booking.Showtime.Movie.Title,
            TicketCode     = booking.TicketCode,
            QrCodeUrl      = $"/api/booking/{booking.BookingId}/ticket-qr",
            PosterUrl      = booking.Showtime.Movie.PosterUrl,
            Duration       = booking.Showtime.Movie.Duration,
            ShowDate       = booking.Showtime.ShowDate,
            StartTime      = booking.Showtime.StartTime,
            EndTime        = booking.Showtime.EndTime,
            CinemaName     = booking.Showtime.Room.Cinema.Name,
            CinemaAddress  = booking.Showtime.Room.Cinema.Address ?? string.Empty,
            RoomName       = booking.Showtime.Room.RoomName,
            RoomType       = booking.Showtime.Room.RoomType,
            Seats          = seats,
            Combos         = booking.BookingCombos.Select(bc => new BookingComboDetailDto
            {
                BookingComboId = bc.BookingComboId,
                ComboId        = bc.ComboId,
                ComboName      = bc.Combo.Name,
                ImageUrl       = bc.Combo.ImageUrl,
                Quantity       = bc.Quantity,
                UnitPrice      = bc.UnitPrice
            }).ToList(),
            Foods          = booking.BookingFoods.Select(bf => new BookingFoodDetailDto
            {
                FoodItemId = bf.FoodItemId,
                FoodName   = bf.FoodName,
                Quantity   = bf.Quantity,
                UnitPrice  = bf.UnitPrice
            }).ToList(),
            SubTotal       = subTotal,
            PromoCode      = booking.Promotion?.Code,
            DiscountPercent = booking.Promotion?.DiscountPercent ?? 0,
            TotalAmount    = booking.TotalAmount,
            BookingStatus  = booking.Status,
            BookingDate    = booking.BookingDate,
            PaymentStatus  = latestPayment?.PaymentStatus,
            PaymentMethod  = latestPayment?.Method,
            PaidAt         = latestPayment?.PaidAt
        };
    }

    public async Task<string?> GetTicketCodeAsync(int bookingId, int userId)
    {
        var booking = await _context.Bookings.FirstOrDefaultAsync(candidate =>
            candidate.BookingId == bookingId && candidate.UserId == userId &&
            (candidate.Status == "Paid" || candidate.Status == "Confirmed"));
        if (booking == null) return null;

        if (string.IsNullOrEmpty(booking.TicketCode))
        {
            booking.TicketCode = $"TK-{booking.BookingId:D6}-{DateTime.UtcNow:yyyyMMdd}";
            await _context.SaveChangesAsync();
        }

        return booking.TicketCode;
    }

    public async Task<List<AdminBookingDto>> GetAdminBookingsAsync() => await _context.Bookings
        .AsNoTracking()
        .OrderByDescending(booking => booking.BookingDate)
        .Select(booking => new AdminBookingDto(
            booking.BookingId,
            "MB-" + booking.BookingId.ToString("D6"),
            booking.User.FullName,
            booking.User.Email,
            booking.Showtime.Movie.Title,
            booking.Showtime.Movie.PosterUrl,
            booking.Showtime.ShowDate.ToString("yyyy-MM-dd"),
            booking.Showtime.StartTime.ToString("HH:mm"),
            booking.BookingDate.ToString("yyyy-MM-dd HH:mm"),
            booking.BookingDetails.Count,
            booking.BookingDetails.Select(detail => detail.ShowtimeSeat.Seat.SeatRow + detail.ShowtimeSeat.Seat.SeatNumber).ToList(),
            booking.TotalAmount,
            booking.Status))
        .ToListAsync();

    public async Task<PaginationResponseDto<AdminBookingDto>> GetAdminBookingsPagedAsync(AdminBookingQueryDto query)
    {
        var q = _context.Bookings.AsNoTracking().AsQueryable();

        // Filter keyword: bookingCode pattern "MB-XXXXXX", customerName, email
        if (!string.IsNullOrWhiteSpace(query.Keyword))
        {
            var kw = query.Keyword.Trim().ToLower();
            // Nếu keyword dạng MB-XXXXXX → lấy phần số
            if (kw.StartsWith("mb-") && int.TryParse(kw[3..], out var codeNum))
                q = q.Where(b => b.BookingId == codeNum);
            else
                q = q.Where(b =>
                    b.User.FullName.ToLower().Contains(kw) ||
                    b.User.Email.ToLower().Contains(kw));
        }

        if (!string.IsNullOrWhiteSpace(query.Status))
            q = q.Where(b => b.Status == query.Status);

        if (query.CinemaId.HasValue)
            q = q.Where(b => b.Showtime.Room.CinemaId == query.CinemaId.Value);

        if (!string.IsNullOrWhiteSpace(query.FromDate) && DateOnly.TryParse(query.FromDate, out var from))
            q = q.Where(b => DateOnly.FromDateTime(b.BookingDate) >= from);

        if (!string.IsNullOrWhiteSpace(query.ToDate) && DateOnly.TryParse(query.ToDate, out var to))
            q = q.Where(b => DateOnly.FromDateTime(b.BookingDate) <= to);

        // Sort
        q = (query.SortBy?.ToLower(), query.SortOrder?.ToLower()) switch
        {
            ("totalamount", "asc")  => q.OrderBy(b => b.TotalAmount),
            ("totalamount", _)      => q.OrderByDescending(b => b.TotalAmount),
            ("status", "asc")       => q.OrderBy(b => b.Status),
            ("status", _)           => q.OrderByDescending(b => b.Status),
            (_, "asc")              => q.OrderBy(b => b.BookingDate),
            _                       => q.OrderByDescending(b => b.BookingDate),
        };

        var totalItems = await q.CountAsync();
        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var page = Math.Max(query.Page, 1);
        var totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);

        var data = await q
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(b => new AdminBookingDto(
                b.BookingId,
                "MB-" + b.BookingId.ToString("D6"),
                b.User.FullName,
                b.User.Email,
                b.Showtime.Movie.Title,
                b.Showtime.Movie.PosterUrl,
                b.Showtime.ShowDate.ToString("yyyy-MM-dd"),
                b.Showtime.StartTime.ToString("HH:mm"),
                b.BookingDate.ToString("yyyy-MM-dd HH:mm"),
                b.BookingDetails.Count,
                b.BookingDetails
                    .Select(d => d.ShowtimeSeat.Seat.SeatRow + d.ShowtimeSeat.Seat.SeatNumber.ToString())
                    .ToList(),
                b.TotalAmount,
                b.Status))
            .ToListAsync();

        return new PaginationResponseDto<AdminBookingDto>
        {
            Data = data,
            CurrentPage = page,
            PageSize = pageSize,
            TotalItems = totalItems,
            TotalPages = totalPages,
        };
    }

    public async Task<AdminBookingSummaryDto> GetAdminBookingSummaryAsync(AdminBookingQueryDto query)
    {
        var q = _context.Bookings.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Keyword))
        {
            var kw = query.Keyword.Trim().ToLower();
            if (kw.StartsWith("mb-") && int.TryParse(kw[3..], out var codeNum))
                q = q.Where(b => b.BookingId == codeNum);
            else
                q = q.Where(b =>
                    b.User.FullName.ToLower().Contains(kw) ||
                    b.User.Email.ToLower().Contains(kw));
        }
        if (query.CinemaId.HasValue)
            q = q.Where(b => b.Showtime.Room.CinemaId == query.CinemaId.Value);
        if (!string.IsNullOrWhiteSpace(query.FromDate) && DateOnly.TryParse(query.FromDate, out var from))
            q = q.Where(b => DateOnly.FromDateTime(b.BookingDate) >= from);
        if (!string.IsNullOrWhiteSpace(query.ToDate) && DateOnly.TryParse(query.ToDate, out var to))
            q = q.Where(b => DateOnly.FromDateTime(b.BookingDate) <= to);

        var groups = await q
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Total     = g.Count(),
                Paid      = g.Count(b => b.Status == "Paid"),
                Pending   = g.Count(b => b.Status == "Pending"),
                Cancelled = g.Count(b => b.Status == "Cancelled"),
                Revenue   = g.Where(b => b.Status == "Paid").Sum(b => (decimal?)b.TotalAmount) ?? 0m,
            })
            .FirstOrDefaultAsync();

        return new AdminBookingSummaryDto
        {
            Total         = groups?.Total     ?? 0,
            Paid          = groups?.Paid      ?? 0,
            Pending       = groups?.Pending   ?? 0,
            Cancelled     = groups?.Cancelled ?? 0,
            TotalRevenue  = groups?.Revenue   ?? 0m,
        };
    }

    public async Task<AdminBookingDetailDto?> GetAdminBookingDetailAsync(int bookingId)
    {
        var b = await _context.Bookings
            .AsNoTracking()
            .Include(x => x.User)
            .Include(x => x.Showtime).ThenInclude(s => s.Movie)
            .Include(x => x.Showtime).ThenInclude(s => s.Room).ThenInclude(r => r.Cinema)
            .Include(x => x.BookingDetails).ThenInclude(d => d.ShowtimeSeat).ThenInclude(ss => ss.Seat)
            .Include(x => x.Promotion)
            .Include(x => x.Payments)
            .FirstOrDefaultAsync(x => x.BookingId == bookingId);

        if (b == null) return null;

        var seats = b.BookingDetails.Select(d => new AdminBookingDetailSeatDto
        {
            SeatLabel = d.ShowtimeSeat.Seat.SeatRow + d.ShowtimeSeat.Seat.SeatNumber.ToString(),
            SeatType  = d.ShowtimeSeat.Seat.SeatType ?? "Normal",
            Price     = d.Price,
        }).ToList();

        var discountPct  = b.Promotion?.DiscountPercent ?? 0m;
        var subTotal     = seats.Sum(s => s.Price);
        var discountAmt  = Math.Round(subTotal * discountPct / 100, 0);

        return new AdminBookingDetailDto
        {
            BookingId       = b.BookingId,
            BookingCode     = "MB-" + b.BookingId.ToString("D6"),
            Status          = b.Status,
            BookingDate     = b.BookingDate,
            CustomerId      = b.UserId,
            CustomerName    = b.User.FullName,
            CustomerEmail   = b.User.Email,
            MovieId         = b.Showtime.MovieId,
            MovieTitle      = b.Showtime.Movie.Title,
            PosterUrl       = b.Showtime.Movie.PosterUrl,
            ShowDate        = b.Showtime.ShowDate.ToString("yyyy-MM-dd"),
            StartTime       = b.Showtime.StartTime.ToString("HH:mm"),
            EndTime         = b.Showtime.EndTime.ToString("HH:mm"),
            CinemaName      = b.Showtime.Room.Cinema.Name,
            RoomName        = b.Showtime.Room.RoomName,
            Seats           = seats,
            SubTotal        = subTotal,
            PromoCode       = b.Promotion?.Code,
            DiscountPercent = discountPct,
            DiscountAmount  = discountAmt,
            TotalAmount     = b.TotalAmount,
            Payments        = b.Payments.Select(p => new AdminBookingPaymentDto
            {
                PaymentId       = p.PaymentId,
                Method          = p.Method,
                Amount          = p.Amount,
                Status          = p.PaymentStatus,
                TransactionCode = p.TransactionCode,
                PaidAt          = p.PaidAt?.ToString("yyyy-MM-dd HH:mm"),
            }).ToList(),
        };
    }

    // -----------------------------------------------------------------------
    // CANCEL
    // -----------------------------------------------------------------------

    public async Task<(bool Success, string? Error)> CancelBookingAsync(int bookingId, int userId)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var booking = await _context.Bookings
                .Include(b => b.Showtime)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.ShowtimeSeat)
                .Include(b => b.Payments)
                .FirstOrDefaultAsync(b => b.BookingId == bookingId && b.UserId == userId);

            if (booking == null)
                return (false, "Booking không tồn tại.");
            if (booking.Showtime.Status != "Active")
                return (false, "Suất chiếu đã ngừng nhận đặt vé.");
            if (booking.Status != "Pending")
                return (false, "Chỉ có thể hủy booking ở trạng thái Pending (chưa thanh toán).");
            if (booking.Payments.Any(payment => payment.PaymentStatus is "Success" or "Completed" or "PaidNeedRefund"))
                return (false, "Booking có giao dịch đã nhận tiền và cần xử lý hoàn tiền riêng.");

            booking.Status = "Cancelled";

            foreach (var detail in booking.BookingDetails)
            {
                var seat = detail.ShowtimeSeat;
                if (seat.Status == "Holding" && seat.LockedByUserId == userId)
                {
                    seat.Status = "Available";
                    seat.HoldExpiresAt = null;
                    seat.LockedByUserId = null;
                }
            }

            _context.BookingDetails.RemoveRange(booking.BookingDetails);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return (true, null);
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            return (false, "Không thể hủy booking lúc này. Vui lòng thử lại.");
        }
    }

    // -----------------------------------------------------------------------
    // PAYMENT SUPPORT
    // -----------------------------------------------------------------------

    public async Task<PaymentViewModel?> GetPaymentViewModelAsync(int bookingId, int userId)
    {
        var booking = await _context.Bookings
            .Include(b => b.Showtime)
                .ThenInclude(s => s.Movie)
            .Include(b => b.Showtime)
                .ThenInclude(s => s.Room)
                    .ThenInclude(r => r.Cinema)
            .Include(b => b.BookingDetails)
                .ThenInclude(bd => bd.ShowtimeSeat)
                    .ThenInclude(ss => ss.Seat)
            .Include(b => b.Payments)
            .Include(b => b.Promotion)
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.BookingId == bookingId && b.UserId == userId);

        if (booking == null || booking.Status != "Pending") return null;

        var seatLabels = booking.BookingDetails
            .Select(bd => $"{bd.ShowtimeSeat.Seat.SeatRow}{bd.ShowtimeSeat.Seat.SeatNumber}")
            .OrderBy(l => l)
            .ToList();

        return new PaymentViewModel
        {
            BookingId          = booking.BookingId,
            MovieTitle         = booking.Showtime.Movie.Title,
            ShowDate           = booking.Showtime.ShowDate,
            StartTime          = booking.Showtime.StartTime,
            CinemaName         = booking.Showtime.Room.Cinema.Name,
            RoomName           = booking.Showtime.Room.RoomName,
            SeatLabels         = seatLabels,
            TotalAmount        = booking.TotalAmount,
            PromoCode          = booking.Promotion?.Code,
            DiscountPercent    = booking.Promotion?.DiscountPercent ?? 0,
            HasPreviousFailure = booking.Payments.Any(p => p.PaymentStatus == "Failed")
        };
    }

    public async Task<BookingSuccessViewModel?> GetSuccessViewModelAsync(int bookingId, int userId)
    {
        var booking = await _context.Bookings
            .Include(b => b.Showtime)
                .ThenInclude(s => s.Movie)
            .Include(b => b.Showtime)
                .ThenInclude(s => s.Room)
                    .ThenInclude(r => r.Cinema)
            .Include(b => b.BookingDetails)
                .ThenInclude(bd => bd.ShowtimeSeat)
                    .ThenInclude(ss => ss.Seat)
            .Include(b => b.Payments)
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.BookingId == bookingId && b.UserId == userId);

        if (booking == null || booking.Status != "Paid") return null;

        var successPayment = booking.Payments
            .OrderByDescending(p => p.PaymentId)
            .FirstOrDefault(p => p.PaymentStatus == "Success");

        var seatLabels = booking.BookingDetails
            .Select(bd => $"{bd.ShowtimeSeat.Seat.SeatRow}{bd.ShowtimeSeat.Seat.SeatNumber}")
            .OrderBy(l => l)
            .ToList();

        return new BookingSuccessViewModel
        {
            BookingId     = booking.BookingId,
            MovieTitle    = booking.Showtime.Movie.Title,
            TicketCode = booking.TicketCode,
            PosterUrl     = booking.Showtime.Movie.PosterUrl,
            ShowDate      = booking.Showtime.ShowDate,
            StartTime     = booking.Showtime.StartTime,
            CinemaName    = booking.Showtime.Room.Cinema.Name,
            RoomName      = booking.Showtime.Room.RoomName,
            SeatLabels    = seatLabels,
            TotalAmount   = booking.TotalAmount,
            PaymentMethod = successPayment?.Method ?? "N/A",
            PaidAt        = successPayment?.PaidAt ?? booking.BookingDate
        };
    }
}
