export const SHOWTIME_STATUSES = ["Active", "Cancelled", "Finished"];

export function readShowtime(value = {}) {
  return {
    ...value,
    showtimeId: value.showtimeId ?? value.ShowtimeId ?? value.id ?? value.Id,
    movieId: value.movieId ?? value.MovieId,
    movieName: value.movieName ?? value.MovieName ?? value.movieTitle ?? value.MovieTitle ?? "—",
    posterUrl: value.posterUrl ?? value.PosterUrl ?? null,
    cinemaId: value.cinemaId ?? value.CinemaId,
    cinemaName: value.cinemaName ?? value.CinemaName ?? "—",
    roomId: value.roomId ?? value.RoomId,
    roomName: value.roomName ?? value.RoomName ?? "—",
    roomType: value.roomType ?? value.RoomType ?? "",
    totalSeats: value.totalSeats ?? value.TotalSeats,
    showDate: String(value.showDate ?? value.ShowDate ?? "").slice(0, 10),
    startTime: String(value.startTime ?? value.StartTime ?? "").slice(0, 5),
    endTime: String(value.endTime ?? value.EndTime ?? "").slice(0, 5),
    price: Number(value.price ?? value.Price ?? 0),
    vipMultiplier: Number(value.vipMultiplier ?? value.VipMultiplier ?? 1.2),
    status: value.status ?? value.Status ?? "Active",
  };
}

export function formatDate(date) {
  if (!date) return "—";
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Date(year, month - 1, day).toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatTime(value) {
  return String(value || "").slice(0, 5) || "—";
}

export function toDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(dateValue, count) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + count);
  return toDateInput(date);
}

export function startOfWeek(dateValue) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return toDateInput(date);
}

export function statusLabel(status) {
  return ({ Active: "Đang mở bán", Cancelled: "Đã hủy", Finished: "Đã hoàn thành" })[status] || status;
}

export function statusClass(status) {
  return ({
    Active: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    Cancelled: "border-rose-400/30 bg-rose-400/10 text-rose-300",
    Finished: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  })[status] || "border-slate-600 bg-slate-800 text-slate-300";
}

export function startMinutes(showtime) {
  const [hours, minutes] = showtime.startTime.split(":").map(Number);
  return hours * 60 + minutes;
}

export function endMinutes(showtime) {
  const [hours, minutes] = showtime.endTime.split(":").map(Number);
  return hours * 60 + minutes;
}

export function getOverlappingIds(showtimes) {
  const overlaps = new Set();
  for (let left = 0; left < showtimes.length; left += 1) {
    for (let right = left + 1; right < showtimes.length; right += 1) {
      if (startMinutes(showtimes[left]) < endMinutes(showtimes[right]) &&
          endMinutes(showtimes[left]) > startMinutes(showtimes[right])) {
        overlaps.add(showtimes[left].showtimeId);
        overlaps.add(showtimes[right].showtimeId);
      }
    }
  }
  return overlaps;
}
