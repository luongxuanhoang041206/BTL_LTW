using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using MovieBooking.Data;
using MovieBooking.DTOs;
using MovieBooking.DTOs.Showtime;
using MovieBooking.Models;
using MovieBooking.Services.Interfaces;

namespace MovieBooking.Services;

public sealed class ShowtimeService : IShowtimeService
{
    private readonly MovieBookingContext _context;
    private readonly ISystemSettingsService _systemSettings;

    public ShowtimeService(MovieBookingContext context, ISystemSettingsService systemSettings)
    {
        _context = context;
        _systemSettings = systemSettings;
    }

    public async Task<List<ShowtimeListDto>> GetAdminShowtimesAsync()
    {
        return await _context.Showtimes
            .AsNoTracking()
            .OrderByDescending(s => s.ShowDate)
            .ThenByDescending(s => s.StartTime)
            .Select(s => new ShowtimeListDto
            {
                ShowtimeId = s.ShowtimeId,
                MovieId = s.MovieId,
                MovieTitle = s.Movie.Title,
                PosterUrl = s.Movie.PosterUrl,
                CinemaId = s.Room.CinemaId,
                CinemaName = s.Room.Cinema.Name,
                RoomId = s.RoomId,
                RoomName = s.Room.RoomName,
                ShowDateTime = $"{s.ShowDate:yyyy-MM-dd}T{s.StartTime:HH:mm:ss}",
                ShowDate = s.ShowDate.ToString("yyyy-MM-dd"),
                StartTime = s.StartTime.ToString("HH:mm"),
                EndTime = s.EndTime.ToString("HH:mm"),
                Price = s.Price,
                TotalBookings = s.ShowtimeSeats.Count(ss => ss.Status == "Booked"),
                TotalSeats = s.ShowtimeSeats.Count,
                Earnings = s.ShowtimeSeats.Count(ss => ss.Status == "Booked") * s.Price,
                Status = s.Status
            })
            .ToListAsync();
    }

    public async Task<List<AdminShowtimeResponseDto>> GetAdminShowtimeResponsesAsync()
        => (await GetAdminShowtimesAsync()).Select(showtime => new AdminShowtimeResponseDto(
            showtime.ShowtimeId, showtime.MovieId, showtime.MovieTitle,
            showtime.CinemaId, showtime.CinemaName, showtime.RoomId, showtime.RoomName,
            showtime.ShowDate, showtime.StartTime, showtime.EndTime, showtime.Price, showtime.Status)).ToList();

    public async Task<(bool Success, int? ShowtimeId, string? Error)> CreateShowtimeAsync(
        int movieId, int roomId, string date, string startTime, decimal price, decimal? vipMultiplier)
    {
        if (movieId <= 0 || roomId <= 0)
            return (false, null, "Phim và phòng chiếu không hợp lệ.");

        if (!DateOnly.TryParse(date, out var showDate) ||
            !TimeOnly.TryParse(startTime, out var parsedStartTime))
        {
            return (false, null, "Định dạng ngày hoặc giờ không hợp lệ.");
        }

        if (price <= 0 || price > 99999999.99m)
            return (false, null, "Giá vé phải nằm trong khoảng hợp lệ.");
        if (vipMultiplier.HasValue && (vipMultiplier.Value <= 0 || vipMultiplier.Value > 999.99m))
            return (false, null, "Hệ số ghế VIP phải nằm trong khoảng hợp lệ.");

        IDbContextTransaction? transaction = null;
        try
        {
            transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

            var movie = await _context.Movies
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.MovieId == movieId);
            if (movie == null)
            {
                await transaction.RollbackAsync();
                return (false, null, "Không tìm thấy phim.");
            }

            if (!IsSchedulableMovie(movie, showDate, out var movieError))
            {
                await transaction.RollbackAsync();
                return (false, null, movieError);
            }

            var roomExists = await _context.Rooms
                .AsNoTracking()
                .AnyAsync(r => r.RoomId == roomId);
            if (!roomExists)
            {
                await transaction.RollbackAsync();
                return (false, null, "Không tìm thấy phòng chiếu.");
            }

            // Kiểm tra phòng có ghế đang hoạt động hay không
            var roomSeats = await _context.Seats
                .AsNoTracking()
                .Where(s => s.RoomId == roomId && s.IsActive)
                .OrderBy(s => s.SeatRow)
                .ThenBy(s => s.SeatNumber)
                .ToListAsync();

            if (roomSeats.Count == 0)
            {
                await transaction.RollbackAsync();
                return (false, null, "Phòng chiếu không có ghế đang hoạt động.");
            }

            if (!TryCalculateEndTime(parsedStartTime, movie.Duration, out var endTime))
            {
                await transaction.RollbackAsync();
                return (false, null, "Suất chiếu không được kết thúc sang ngày hôm sau.");
            }

            if (await HasOverlappingShowtimeAsync(roomId, showDate, parsedStartTime, endTime))
            {
                await transaction.RollbackAsync();
                return (false, null, "Lịch chiếu bị trùng với suất chiếu khác trong phòng.");
            }

            // Không truyền hệ số VIP thì lấy mặc định toàn cục từ cấu hình hệ thống
            var effectiveVipMultiplier = vipMultiplier ?? (await _systemSettings.GetAsync()).VipPriceMultiplier;

            // 1. Tạo Showtime trước để lấy ShowtimeId
            var showtime = new Showtime
            {
                MovieId = movieId,
                RoomId = roomId,
                ShowDate = showDate,
                StartTime = parsedStartTime,
                EndTime = endTime,
                Price = price,
                VipMultiplier = effectiveVipMultiplier,
                Status = "Active"
            };

            _context.Showtimes.Add(showtime);
            await _context.SaveChangesAsync();

            // 2. Tạo danh sách ShowtimeSeat từ các Seat đang hoạt động thuộc đúng RoomId
            var distinctSeats = roomSeats
                .GroupBy(s => s.SeatId)
                .Select(g => g.First())
                .ToList();

            var showtimeSeats = distinctSeats.Select(seat => new ShowtimeSeat
            {
                ShowtimeId = showtime.ShowtimeId,
                SeatId = seat.SeatId,
                Status = "Available",
                HoldExpiresAt = null,
                LockedByUserId = null
            }).ToList();

            _context.ShowtimeSeats.AddRange(showtimeSeats);
            await _context.SaveChangesAsync();

            await transaction.CommitAsync();
            return (true, showtime.ShowtimeId, null);
        }
        catch (DbUpdateException ex)
        {
            await RollbackSafelyAsync(transaction);
            if (ex.InnerException?.Message.Contains("UQ_ShowtimeSeat") == true ||
                ex.Message.Contains("UQ_ShowtimeSeat"))
            {
                return (false, null, "Ghế của suất chiếu đã tồn tại.");
            }
            return (false, null, "Không thể lưu thông tin suất chiếu hoặc danh sách ghế. Vui lòng thử lại.");
        }
        catch (Exception)
        {
            await RollbackSafelyAsync(transaction);
            return (false, null, "Đã xảy ra lỗi khi tạo suất chiếu.");
        }
        finally
        {
            if (transaction != null)
                await transaction.DisposeAsync();
        }
    }

    public async Task<(bool Success, string? Error)> UpdateShowtimeAsync(
        int id, int? movieId, int? roomId, string? date, string? startTime, decimal? price,
        decimal? vipMultiplier, string? status)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

        try
        {
            var showtime = await _context.Showtimes
                .Include(s => s.Movie)
                .FirstOrDefaultAsync(s => s.ShowtimeId == id);
            if (showtime == null)
            {
                await transaction.RollbackAsync();
                return (false, "Không tìm thấy suất chiếu.");
            }

            var targetMovieId = movieId ?? showtime.MovieId;
            var movie = targetMovieId == showtime.MovieId
                ? showtime.Movie
                : await _context.Movies.FirstOrDefaultAsync(m => m.MovieId == targetMovieId);
            if (movie == null)
            {
                await transaction.RollbackAsync();
                return (false, "Không tìm thấy phim.");
            }

            var targetRoomId = roomId ?? showtime.RoomId;
            if (!await _context.Rooms.AnyAsync(r => r.RoomId == targetRoomId))
            {
                await transaction.RollbackAsync();
                return (false, "Không tìm thấy phòng chiếu.");
            }

            var targetDate = showtime.ShowDate;
            if (!string.IsNullOrWhiteSpace(date))
            {
                if (!DateOnly.TryParse(date, out var parsedDate))
                {
                    await transaction.RollbackAsync();
                    return (false, "Ngày không hợp lệ.");
                }
                targetDate = parsedDate;
            }

            var targetStartTime = showtime.StartTime;
            if (!string.IsNullOrWhiteSpace(startTime))
            {
                if (!TimeOnly.TryParse(startTime, out var parsedStartTime))
                {
                    await transaction.RollbackAsync();
                    return (false, "Giờ không hợp lệ.");
                }
                targetStartTime = parsedStartTime;
            }

            if (price.HasValue && (price.Value <= 0 || price.Value > 99999999.99m))
            {
                await transaction.RollbackAsync();
                return (false, "Giá vé phải nằm trong khoảng hợp lệ.");
            }
            if (vipMultiplier.HasValue && (vipMultiplier.Value <= 0 || vipMultiplier.Value > 999.99m))
            {
                await transaction.RollbackAsync();
                return (false, "Hệ số ghế VIP phải nằm trong khoảng hợp lệ.");
            }

            var targetStatus = string.IsNullOrWhiteSpace(status) ? showtime.Status : status.Trim();
            if (!IsValidShowtimeStatus(targetStatus))
            {
                await transaction.RollbackAsync();
                return (false, "Trạng thái suất chiếu không hợp lệ.");
            }
            if (!string.IsNullOrWhiteSpace(status) && targetStatus != showtime.Status)
            {
                await transaction.RollbackAsync();
                return (false, "Vui lòng sử dụng API vòng đời Showtime để thay đổi trạng thái.");
            }

            var scheduleChanged = targetMovieId != showtime.MovieId || targetRoomId != showtime.RoomId ||
                targetDate != showtime.ShowDate || targetStartTime != showtime.StartTime;
            if (scheduleChanged && !IsSchedulableMovie(movie, targetDate, out var movieError))
            {
                await transaction.RollbackAsync();
                return (false, movieError);
            }

            var targetEndTime = showtime.EndTime;
            if (scheduleChanged && !TryCalculateEndTime(targetStartTime, movie.Duration, out targetEndTime))
            {
                await transaction.RollbackAsync();
                return (false, "Suất chiếu không được kết thúc sang ngày hôm sau.");
            }

            if (scheduleChanged)
            {
                var hasBookings = await _context.Bookings.AnyAsync(b => b.ShowtimeId == id);
                var hasBookingDetails = await _context.BookingDetails.AnyAsync(bd => bd.ShowtimeSeat.ShowtimeId == id);
                var hasReservedSeats = await _context.ShowtimeSeats
                    .AnyAsync(s => s.ShowtimeId == id &&
                        (s.Status != "Available" || s.LockedByUserId != null || s.BookingDetail != null));
                if (hasBookings || hasBookingDetails || hasReservedSeats)
                {
                    await transaction.RollbackAsync();
                    return (false, "Không thể đổi phim, phòng hoặc thời gian khi suất chiếu đã có vé hoặc ghế đang được giữ.");
                }
            }

            var priceChanged = price.HasValue && price.Value != showtime.Price;
            var vipMultiplierChanged = vipMultiplier.HasValue && vipMultiplier.Value != showtime.VipMultiplier;
            if (priceChanged || vipMultiplierChanged)
            {
                var hasBookings = await _context.Bookings.AnyAsync(b => b.ShowtimeId == id);
                var hasBookingDetails = await _context.BookingDetails.AnyAsync(bd => bd.ShowtimeSeat.ShowtimeId == id);
                var hasReservedSeats = await _context.ShowtimeSeats
                    .AnyAsync(s => s.ShowtimeId == id &&
                        (s.Status != "Available" || s.LockedByUserId != null || s.BookingDetail != null));
                if (hasBookings || hasBookingDetails || hasReservedSeats)
                {
                    await transaction.RollbackAsync();
                    return (false, "Không thể đổi giá khi suất chiếu đã có vé hoặc ghế đang được giữ.");
                }
            }

            if (targetStatus == "Cancelled" && await _context.Bookings.AnyAsync(b => b.ShowtimeId == id))
            {
                await transaction.RollbackAsync();
                return (false, "Không thể hủy suất chiếu đã có đặt vé.");
            }

            if (targetStatus == "Active" &&
                await HasOverlappingShowtimeAsync(targetRoomId, targetDate, targetStartTime, targetEndTime, id))
            {
                await transaction.RollbackAsync();
                return (false, "Lịch chiếu bị trùng với suất chiếu khác trong phòng.");
            }

            // Đồng bộ ghế chỉ khi thay đổi phòng chiếu
            if (targetRoomId != showtime.RoomId)
            {
                var targetRoomSeats = await _context.Seats
                    .AsNoTracking()
                    .Where(s => s.RoomId == targetRoomId && s.IsActive)
                    .OrderBy(s => s.SeatRow)
                    .ThenBy(s => s.SeatNumber)
                    .ToListAsync();

                if (targetRoomSeats.Count == 0)
                {
                    await transaction.RollbackAsync();
                    return (false, "Phòng chiếu mới không có ghế đang hoạt động.");
                }

                var oldSeats = await _context.ShowtimeSeats.Where(s => s.ShowtimeId == id).ToListAsync();
                _context.ShowtimeSeats.RemoveRange(oldSeats);

                var distinctNewSeats = targetRoomSeats
                    .GroupBy(s => s.SeatId)
                    .Select(g => g.First())
                    .ToList();

                _context.ShowtimeSeats.AddRange(distinctNewSeats.Select(seat => new ShowtimeSeat
                {
                    ShowtimeId = id,
                    SeatId = seat.SeatId,
                    Status = "Available",
                    HoldExpiresAt = null,
                    LockedByUserId = null
                }));
            }

            showtime.MovieId = targetMovieId;
            showtime.Movie = movie;
            showtime.RoomId = targetRoomId;
            showtime.ShowDate = targetDate;
            showtime.StartTime = targetStartTime;
            showtime.EndTime = targetEndTime;
            showtime.Status = targetStatus;
            if (price.HasValue) showtime.Price = price.Value;
            if (vipMultiplier.HasValue) showtime.VipMultiplier = vipMultiplier.Value;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return (true, null);
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync();
            return (false, "Không thể cập nhật suất chiếu hoặc ghế. Vui lòng thử lại.");
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            return (false, "Đã xảy ra lỗi khi cập nhật suất chiếu.");
        }
    }

    public Task<(bool Success, string? Error)> ChangeShowtimeStatusAsync(int id, string status)
    {
        return status?.Trim() switch
        {
            "Cancelled" => CancelShowtimeAsync(id),
            "Finished" => CompleteShowtimeAsync(id),
            _ => Task.FromResult((false, (string?)"Trạng thái Showtime không hợp lệ. Chỉ hỗ trợ Cancelled hoặc Finished."))
        };
    }

    public async Task<(bool Success, string? Error)> CancelShowtimeAsync(int id)
    {
        IDbContextTransaction? transaction = null;
        try
        {
            transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            var showtime = await _context.Showtimes.FirstOrDefaultAsync(s => s.ShowtimeId == id);
            if (showtime == null) return (false, "Không tìm thấy suất chiếu.");
            if (showtime.Status == "Cancelled") return (false, "Suất chiếu đã bị hủy trước đó.");
            if (showtime.Status == "Finished") return (false, "Không thể hủy suất chiếu đã hoàn thành.");
            if (showtime.Status != "Active") return (false, "Trạng thái hiện tại không cho phép hủy suất chiếu.");

            var hasPaidBookings = await _context.Bookings.AnyAsync(b => b.ShowtimeId == id &&
                (b.Status == "Paid" ||
                 b.Payments.Any(p => p.PaymentStatus == "Success" || p.PaymentStatus == "Completed" ||
                                     p.PaymentStatus == "PaidNeedRefund")));
            var hasBookedSeats = await _context.ShowtimeSeats
                .AnyAsync(s => s.ShowtimeId == id && s.Status == "Booked");

            // Keep booking, detail, and payment rows as history. Only stop pending payment
            // attempts and release unpaid holds. Paid history remains and is flagged for manual refund.
            await _context.Payments
                .Where(p => p.Booking.ShowtimeId == id &&
                    (p.PaymentStatus == "Success" || p.PaymentStatus == "Completed"))
                .ExecuteUpdateAsync(update => update.SetProperty(p => p.PaymentStatus, "PaidNeedRefund"));
            await _context.ShowtimeSeats
                .Where(s => s.ShowtimeId == id && s.Status == "Holding" && s.BookingDetail != null &&
                    (s.BookingDetail.Booking.Status == "Paid" ||
                     s.BookingDetail.Booking.Payments.Any(p => p.PaymentStatus == "PaidNeedRefund")))
                .ExecuteUpdateAsync(update => update
                    .SetProperty(s => s.Status, "Booked")
                    .SetProperty(s => s.HoldExpiresAt, (DateTime?)null)
                    .SetProperty(s => s.LockedByUserId, (int?)null));

            await _context.Payments
                .Where(p => p.Booking.ShowtimeId == id && p.PaymentStatus == "Pending" &&
                    !p.Booking.Payments.Any(other => other.PaymentStatus == "Success" ||
                        other.PaymentStatus == "Completed" || other.PaymentStatus == "PaidNeedRefund"))
                .ExecuteUpdateAsync(update => update.SetProperty(p => p.PaymentStatus, "Failed"));
            await _context.Bookings
                .Where(b => b.ShowtimeId == id && b.Status == "Pending" &&
                    !b.Payments.Any(p => p.PaymentStatus == "Success" || p.PaymentStatus == "Completed" ||
                                         p.PaymentStatus == "PaidNeedRefund"))
                .ExecuteUpdateAsync(update => update.SetProperty(b => b.Status, "Cancelled"));
            await _context.ShowtimeSeats
                .Where(s => s.ShowtimeId == id && s.Status == "Holding" &&
                    (s.BookingDetail == null || s.BookingDetail.Booking.Status == "Cancelled"))
                .ExecuteUpdateAsync(update => update
                    .SetProperty(s => s.Status, "Available")
                    .SetProperty(s => s.HoldExpiresAt, (DateTime?)null)
                    .SetProperty(s => s.LockedByUserId, (int?)null));

            showtime.Status = "Cancelled";
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return (true, hasPaidBookings || hasBookedSeats
                ? "Suất chiếu đã hủy. Vé và lịch sử giao dịch đã thanh toán được giữ nguyên; cần xử lý hoàn tiền thủ công."
                : null);
        }
        catch (Exception)
        {
            await RollbackSafelyAsync(transaction);
            return (false, "Không thể hủy suất chiếu lúc này. Vui lòng thử lại.");
        }
        finally
        {
            if (transaction != null)
                await transaction.DisposeAsync();
        }
    }

    public async Task<(bool Success, string? Error)> CompleteShowtimeAsync(int id)
    {
        IDbContextTransaction? transaction = null;
        try
        {
            transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            var showtime = await _context.Showtimes.FirstOrDefaultAsync(s => s.ShowtimeId == id);
            if (showtime == null) return (false, "Không tìm thấy suất chiếu.");
            if (showtime.Status == "Cancelled") return (false, "Không thể hoàn thành suất chiếu đã bị hủy.");
            if (showtime.Status == "Finished") return (false, "Suất chiếu đã hoàn thành trước đó.");
            if (showtime.Status != "Active") return (false, "Trạng thái hiện tại không cho phép hoàn thành suất chiếu.");

            var now = DateTime.Now;
            var showDateTime = showtime.ShowDate.ToDateTime(showtime.StartTime);
            var endDateTime = showtime.ShowDate.ToDateTime(showtime.EndTime);
            if (now < showDateTime)
                return (false, "Không thể hoàn thành suất chiếu trước giờ bắt đầu.");
            if (now < endDateTime)
                return (false, "Chỉ có thể hoàn thành suất chiếu khi đã qua EndTime.");

            await _context.Payments
                .Where(p => p.Booking.ShowtimeId == id && p.Booking.Status == "Pending" &&
                    (p.PaymentStatus == "Success" || p.PaymentStatus == "Completed"))
                .ExecuteUpdateAsync(update => update.SetProperty(p => p.PaymentStatus, "PaidNeedRefund"));
            await _context.ShowtimeSeats
                .Where(s => s.ShowtimeId == id && s.Status == "Holding" && s.BookingDetail != null &&
                    (s.BookingDetail.Booking.Status == "Paid" ||
                     s.BookingDetail.Booking.Payments.Any(p => p.PaymentStatus == "PaidNeedRefund")))
                .ExecuteUpdateAsync(update => update
                    .SetProperty(s => s.Status, "Booked")
                    .SetProperty(s => s.HoldExpiresAt, (DateTime?)null)
                    .SetProperty(s => s.LockedByUserId, (int?)null));
            await _context.Payments
                .Where(p => p.Booking.ShowtimeId == id && p.PaymentStatus == "Pending" &&
                    !p.Booking.Payments.Any(other => other.PaymentStatus == "Success" ||
                        other.PaymentStatus == "Completed" || other.PaymentStatus == "PaidNeedRefund"))
                .ExecuteUpdateAsync(update => update.SetProperty(p => p.PaymentStatus, "Failed"));
            await _context.Bookings
                .Where(b => b.ShowtimeId == id && b.Status == "Pending" &&
                    !b.Payments.Any(p => p.PaymentStatus == "Success" || p.PaymentStatus == "Completed" ||
                                         p.PaymentStatus == "PaidNeedRefund"))
                .ExecuteUpdateAsync(update => update.SetProperty(b => b.Status, "Cancelled"));
            await _context.ShowtimeSeats
                .Where(s => s.ShowtimeId == id && s.Status == "Holding")
                .ExecuteUpdateAsync(update => update
                    .SetProperty(s => s.Status, "Available")
                    .SetProperty(s => s.HoldExpiresAt, (DateTime?)null)
                    .SetProperty(s => s.LockedByUserId, (int?)null));

            showtime.Status = "Finished";
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return (true, null);
        }
        catch (Exception)
        {
            await RollbackSafelyAsync(transaction);
            return (false, "Không thể hoàn thành suất chiếu lúc này. Vui lòng thử lại.");
        }
        finally
        {
            if (transaction != null)
                await transaction.DisposeAsync();
        }
    }

    public async Task<(bool Success, string? Error)> DeleteShowtimeAsync(int id)
    {
        try
        {
            var showtime = await _context.Showtimes
                .FirstOrDefaultAsync(s => s.ShowtimeId == id);
            if (showtime == null) return (false, "Không tìm thấy suất chiếu.");

            if (await _context.Bookings.AnyAsync(b => b.ShowtimeId == id))
                return (false, "Không thể xóa suất chiếu vì đã có người đặt vé.");

            if (await _context.BookingDetails.AnyAsync(bd => bd.ShowtimeSeat.ShowtimeId == id))
                return (false, "Không thể xóa suất chiếu vì có chi tiết vé liên quan.");

            if (await _context.ShowtimeSeats.AnyAsync(s => s.ShowtimeId == id &&
                    (s.Status != "Available" || s.LockedByUserId != null || s.BookingDetail != null)))
                return (false, "Không thể xóa suất chiếu vì có ghế đã được giữ hoặc đặt.");

            _context.Showtimes.Remove(showtime);
            await _context.SaveChangesAsync();
            return (true, null);
        }
        catch (DbUpdateException)
        {
            return (false, "Không thể xóa suất chiếu do có ràng buộc dữ liệu.");
        }
        catch (Exception)
        {
            return (false, "Đã xảy ra lỗi khi xóa suất chiếu.");
        }
    }

    public async Task<PaginationResponseDto<AdminShowtimeDto>> GetAdminShowtimesAsync(ShowtimeQueryDto filter)
    {
        var query = _context.Showtimes.AsNoTracking().AsQueryable();

        if(filter.CinemaId.HasValue)
        {
            query = query.Where(s => s.Room.CinemaId == filter.CinemaId.Value);
        }

        if(filter.RoomId.HasValue)
        {
            query = query.Where(s => s.RoomId == filter.RoomId.Value);
        }

        if(filter.MovieId.HasValue)
        {
            query = query.Where(s => s.MovieId == filter.MovieId.Value);
        }

        if(!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var keyword = filter.Keyword.Trim();

            query = query.Where(s => s.Movie.Title.Contains(keyword));
        }

        if(filter.ShowDate.HasValue)
        {
            query = query.Where(s =>
       s.ShowDate == filter.ShowDate.Value);
        }

        if(!string.IsNullOrWhiteSpace(filter.Status))
        {
            query = query.Where(s => s.Status == filter.Status);
        }

        var sortBy = filter.SortBy?.Trim().ToLowerInvariant();
        var descending = string.Equals(filter.SortOrder, "desc", StringComparison.OrdinalIgnoreCase);
        IOrderedQueryable<Showtime> orderedQuery = (sortBy, descending) switch
        {
            ("showdate" or "date", false) => query.OrderBy(s => s.ShowDate).ThenBy(s => s.StartTime),
            ("showdate" or "date", true) => query.OrderByDescending(s => s.ShowDate).ThenByDescending(s => s.StartTime),
            ("price", false) => query.OrderBy(s => s.Price),
            ("price", true) => query.OrderByDescending(s => s.Price),
            ("endtime", false) => query.OrderBy(s => s.EndTime),
            ("endtime", true) => query.OrderByDescending(s => s.EndTime),
            ("movie", false) => query.OrderBy(s => s.Movie.Title),
            ("movie", true) => query.OrderByDescending(s => s.Movie.Title),
            ("starttime", true) => query.OrderByDescending(s => s.StartTime),
            (_, true) => query.OrderByDescending(s => s.StartTime),
            _ => query.OrderBy(s => s.StartTime)
        };
        orderedQuery = orderedQuery.ThenBy(s => s.ShowDate).ThenBy(s => s.ShowtimeId);

        var totalItems = await query.CountAsync();

        var page = Math.Max(filter.Page, 1);
        var pageSize = Math.Clamp(filter.PageSize, 1, 100);

        var skip = (int)Math.Min((long)(page - 1) * pageSize, int.MaxValue);

        var data = await orderedQuery
            .AsNoTracking()
            .Skip(skip)
            .Take(pageSize)
            .Select(s => new AdminShowtimeDto
            {
                ShowtimeId = s.ShowtimeId,

                MovieId = s.MovieId,
                MovieName = s.Movie.Title,

                CinemaId = s.Room.CinemaId,
                CinemaName = s.Room.Cinema.Name,

                RoomId = s.RoomId,
                RoomName = s.Room.RoomName,

                ShowDate = s.ShowDate,
                StartTime = s.StartTime,
                EndTime = s.EndTime,

                Price = s.Price,
                Status = s.Status,
                VipMultiplier = s.VipMultiplier
            })
            .ToListAsync();

        return new PaginationResponseDto<AdminShowtimeDto>
        {
            Data = data,
            CurrentPage = page,
            PageSize = pageSize,
            TotalItems = totalItems,
            TotalPages = (int)Math.Ceiling(
        totalItems / (double)pageSize)
        };
    }

    public async Task<AdminShowtimeDto?> GetShowtimeByIdAsync(int id)
    {
        return await _context.Showtimes
            .AsNoTracking()
            .Where(s => s.ShowtimeId == id)
            .Select(s => new AdminShowtimeDto
            {
                ShowtimeId = s.ShowtimeId,

                MovieId = s.MovieId,
                MovieName = s.Movie.Title,

                CinemaId = s.Room.CinemaId,
                CinemaName = s.Room.Cinema.Name,

                RoomId = s.RoomId,
                RoomName = s.Room.RoomName,

                ShowDate = s.ShowDate,
                StartTime = s.StartTime,
                EndTime = s.EndTime,

                Price = s.Price,
                Status = s.Status,
                VipMultiplier = s.VipMultiplier
            })
            .FirstOrDefaultAsync();
    }

    private async Task<bool> HasOverlappingShowtimeAsync(
        int roomId, DateOnly showDate, TimeOnly startTime, TimeOnly endTime, int? excludedShowtimeId = null)
    {
        return await _context.Showtimes.AnyAsync(s =>
            s.RoomId == roomId &&
            s.ShowDate == showDate &&
            s.Status == "Active" &&
            (!excludedShowtimeId.HasValue || s.ShowtimeId != excludedShowtimeId.Value) &&
            s.StartTime < endTime &&
            s.EndTime > startTime);
    }

    private static bool IsSchedulableMovie(Movie movie, DateOnly showDate, out string error)
    {
        if (!string.Equals(movie.Status, "Showing", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(movie.Status, "Coming Soon", StringComparison.OrdinalIgnoreCase))
        {
            error = "Phim chưa ở trạng thái được phép xếp lịch.";
            return false;
        }

        if (movie.Duration <= 0)
        {
            error = "Thời lượng phim không hợp lệ.";
            return false;
        }

        if (movie.ReleaseDate.HasValue && showDate < movie.ReleaseDate.Value)
        {
            error = "Ngày chiếu không được trước ngày phát hành của phim.";
            return false;
        }

        if (movie.EndDate.HasValue && showDate > movie.EndDate.Value)
        {
            error = "Ngày chiếu không được sau ngày kết thúc phát hành của phim.";
            return false;
        }

        error = string.Empty;
        return true;
    }

    private static bool TryCalculateEndTime(TimeOnly startTime, int movieDuration, out TimeOnly endTime)
    {
        const int bufferMinutes = 15;
        var durationMinutes = (long)movieDuration + bufferMinutes;
        var totalMinutes = startTime.Hour * 60L + startTime.Minute + durationMinutes;
        if (durationMinutes <= 0 || totalMinutes >= 24 * 60)
        {
            endTime = default;
            return false;
        }

        endTime = startTime.AddMinutes(durationMinutes);
        return true;
    }

    private static bool IsValidShowtimeStatus(string status)
        => status is "Active" or "Cancelled" or "Finished";

    private static async Task RollbackSafelyAsync(IDbContextTransaction? transaction)
    {
        if (transaction == null) return;

        try
        {
            await transaction.RollbackAsync();
        }
        catch
        {
            // Preserve the generic service error if the connection also fails during rollback.
        }
    }

    /////
    public async Task<ShowtimeCalendarResponseDto> GetCalendarAsync(
    ShowtimeCalendarQueryDto filter)
    {
        var startDate = filter.StartDate!.Value;
        var endDate = filter.EndDate!.Value;

        var query = _context.Cinemas
            .AsNoTracking()
            .AsQueryable();

        // Filter Cinema
        if (filter.CinemaId.HasValue)
        {
            query = query.Where(c =>
                c.CinemaId == filter.CinemaId.Value);
        }

        // Filter Room
        if (filter.RoomId.HasValue)
        {
            query = query.Where(c =>
                c.Rooms.Any(r =>
                    r.RoomId == filter.RoomId.Value));
        }

        var result = await query
            .OrderBy(c => c.Name)
            .Select(c => new CinemaCalendarDto
            {
                CinemaId = c.CinemaId,
                CinemaName = c.Name,

                Rooms = c.Rooms
                    .Where(r =>
                        !filter.RoomId.HasValue ||
                        r.RoomId == filter.RoomId.Value)
                    .OrderBy(r => r.RoomName)
                    .Select(r => new RoomCalendarDto
                    {
                        RoomId = r.RoomId,
                        RoomName = r.RoomName,
                        RoomType = r.RoomType,
                        TotalSeats = r.TotalSeats,

                        Showtimes = r.Showtimes
                            .Where(s =>
                                s.ShowDate >= startDate &&
                                s.ShowDate <= endDate)

                            .Where(s =>
                                !filter.MovieId.HasValue ||
                                s.MovieId == filter.MovieId.Value)

                            .Where(s =>
                                string.IsNullOrEmpty(filter.Status) ||
                                s.Status == filter.Status)

                            .OrderBy(s => s.ShowDate)
                            .ThenBy(s => s.StartTime)

                            .Select(s => new ShowtimeCalendarItemDto
                            {
                                ShowtimeId = s.ShowtimeId,

                                MovieId = s.MovieId,
                                MovieName = s.Movie.Title,
                                PosterUrl = s.Movie.PosterUrl,

                                ShowDate = s.ShowDate,
                                StartTime = s.StartTime,
                                EndTime = s.EndTime,

                                Price = s.Price,
                                Status = s.Status
                            })
                            .ToList()
                    })
                    .ToList()
            })
            .ToListAsync();

        return new ShowtimeCalendarResponseDto
        {
            StartDate = startDate,
            EndDate = endDate,
            Data = result
        };
    }
}
