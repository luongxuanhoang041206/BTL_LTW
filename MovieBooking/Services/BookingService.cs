using System;
using System.Collections.Generic;
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

    public async Task<ShowtimeSelectionViewModel?> GetShowtimeSelectionAsync(int movieId)
    {
        var movie = await _context.Movies
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.MovieId == movieId);

        if (movie == null) return null;

        var today = DateOnly.FromDateTime(DateTime.Today);

        var showtimes = await _context.Showtimes
            .Include(s => s.Room)
                .ThenInclude(r => r.Cinema)
            .Include(s => s.ShowtimeSeats)
            .Where(s => s.MovieId == movieId
                     && s.ShowDate >= today
                     && s.Status == "Active")
            .AsNoTracking()
            .OrderBy(s => s.ShowDate)
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
                    StartTime     = s.StartTime,
                    EndTime       = s.EndTime,
                    CinemaName    = s.Room.Cinema.Name,
                    RoomName      = s.Room.RoomName,
                    RoomType      = s.Room.RoomType,
                    Price         = s.Price,
                    AvailableSeats = s.ShowtimeSeats.Count(ss => ss.Status == "Available")
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
            DayGroups  = dayGroups
        };
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
            RoomType     = showtime.Room.RoomType,
            PricePerSeat = showtime.Price,
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

        // 2. Re-read từ DB — không tin client data
        var seats = await _context.ShowtimeSeats
            .Where(ss => ss.ShowtimeId == showtimeId && seatIds.Contains(ss.SeatId))
            .ToListAsync();

        if (seats.Count != seatIds.Count)
            return (false, "Một hoặc nhiều ghế không hợp lệ.");

        // 3. Kiểm tra tất cả còn Available
        var unavailable = seats.Where(s => s.Status != "Available").ToList();
        if (unavailable.Count > 0)
            return (false, "Một hoặc nhiều ghế vừa được người khác chọn. Vui lòng chọn lại.");

        // 4. Atomic update
        var expiresAt = DateTime.Now.AddMinutes(HoldMinutes);
        foreach (var seat in seats)
        {
            seat.Status         = "Holding";
            seat.LockedByUserId = userId;
            seat.HoldExpiresAt  = expiresAt;
        }

        try
        {
            await _context.SaveChangesAsync();
            return (true, null);
        }
        catch (DbUpdateException)
        {
            return (false, "Không thể giữ ghế. Vui lòng thử lại.");
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

        // Lấy showtime để biết giá
        var showtime = await _context.Showtimes
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.ShowtimeId == showtimeId);

        if (showtime == null)
            return (false, null, "Suất chiếu không tồn tại.");

        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // 1. Re-read và lock ShowtimeSeats
            var seats = await _context.ShowtimeSeats
                .Where(ss => showtimeSeatIds.Contains(ss.ShowtimeSeatId))
                .ToListAsync();

            if (seats.Count != showtimeSeatIds.Count)
            {
                await transaction.RollbackAsync();
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
                    await transaction.RollbackAsync();
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
                // Nếu promo không hợp lệ thì bỏ qua (không block booking)
            }

            // 4. Tính tổng tiền
            var totalAmount = CalculateTotal(showtime.Price, seats.Count, discountPercent);

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
                    Price          = showtime.Price
                });
                seat.Status = "Booked";
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return (true, booking.BookingId, null);
        }
        catch (DbUpdateException ex) when (
            ex.InnerException?.Message.Contains("UQ_BookingDetail_Seat") == true
            || ex.InnerException?.Message.Contains("unique") == true)
        {
            await transaction.RollbackAsync();
            return (false, null, "Một hoặc nhiều ghế vừa được đặt bởi người khác. Vui lòng chọn lại.");
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            return (false, null, "Đã xảy ra lỗi. Vui lòng thử lại.");
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

        var subTotal = seats.Sum(s => s.Price);

        return new BookingDetailViewModel
        {
            BookingId      = booking.BookingId,
            MovieTitle     = booking.Showtime.Movie.Title,
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

    // -----------------------------------------------------------------------
    // CANCEL
    // -----------------------------------------------------------------------

    public async Task<(bool Success, string? Error)> CancelBookingAsync(int bookingId, int userId)
    {
        var booking = await _context.Bookings
            .Include(b => b.BookingDetails)
                .ThenInclude(bd => bd.ShowtimeSeat)
            .FirstOrDefaultAsync(b => b.BookingId == bookingId && b.UserId == userId);

        if (booking == null)
            return (false, "Booking không tồn tại.");

        if (booking.Status != "Pending")
            return (false, "Chỉ có thể hủy booking ở trạng thái Pending (chưa thanh toán).");

        booking.Status = "Cancelled";

        foreach (var detail in booking.BookingDetails)
        {
            var seat = detail.ShowtimeSeat;
            seat.Status         = "Available";
            seat.HoldExpiresAt  = null;
            seat.LockedByUserId = null;
        }

        await _context.SaveChangesAsync();
        return (true, null);
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
