import { useEffect, useMemo, useState } from "react";
import { Clock3, Film, X } from "lucide-react";
import { createShowtime, updateShowtime } from "../../../lib/showtimeApi";
import { readShowtime } from "./showtimeUtils";

const emptyForm = {
  movieId: "",
  cinemaId: "",
  roomId: "",
  showDate: "",
  startTime: "",
  price: "75000",
  vipMultiplier: "1.2",
};

function calculateEndTime(startTime, duration) {
  if (!startTime || !duration) return "";
  const [hour, minute] = startTime.split(":").map(Number);
  const end = hour * 60 + minute + Number(duration) + 15;
  if (end >= 24 * 60) return "Vượt sang ngày hôm sau";
  return `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
}

const fieldClass = "mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/15 disabled:cursor-not-allowed disabled:opacity-50";

export function ShowtimeFormModal({ mode = "create", showtime, catalogs, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode !== "edit" || !showtime) return;
    const current = readShowtime(showtime);
    setForm({
      movieId: String(current.movieId ?? ""),
      cinemaId: String(current.cinemaId ?? ""),
      roomId: String(current.roomId ?? ""),
      showDate: current.showDate,
      startTime: current.startTime,
      price: String(current.price),
      vipMultiplier: String(current.vipMultiplier || 1.2),
    });
  }, [mode, showtime]);

  const selectedMovie = useMemo(
    () => catalogs.movies.find((movie) => String(movie.id ?? movie.Id) === form.movieId),
    [catalogs.movies, form.movieId],
  );
  const filteredRooms = useMemo(
    () => catalogs.rooms.filter((room) => String(room.cinemaId ?? room.CinemaId) === form.cinemaId),
    [catalogs.rooms, form.cinemaId],
  );
  const endTimePreview = calculateEndTime(form.startTime, selectedMovie?.duration ?? selectedMovie?.Duration);

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!form.movieId) next.movieId = "Chọn phim cần xếp lịch.";
    if (!form.cinemaId) next.cinemaId = "Chọn rạp chiếu.";
    if (!form.roomId || !filteredRooms.some((room) => String(room.id ?? room.Id) === form.roomId)) {
      next.roomId = "Chọn phòng thuộc rạp đã chọn.";
    }
    if (!form.showDate) next.showDate = "Chọn ngày chiếu.";
    if (!form.startTime) next.startTime = "Chọn giờ bắt đầu.";
    const price = Number(form.price);
    if (!Number.isFinite(price) || price <= 0 || price > 99999999.99) next.price = "Giá vé phải lớn hơn 0 và không vượt quá 99.999.999,99.";
    const multiplier = Number(form.vipMultiplier);
    if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier > 999.99) next.vipMultiplier = "Hệ số VIP phải lớn hơn 0 và không vượt quá 999,99.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving || !validate()) return;
    setSaving(true);
    const payload = {
      movieId: Number(form.movieId),
      roomId: Number(form.roomId),
      date: form.showDate,
      startTime: form.startTime,
      price: Number(form.price),
      vipMultiplier: Number(form.vipMultiplier),
    };

    try {
      const response = mode === "edit"
        ? await updateShowtime(readShowtime(showtime).showtimeId, payload)
        : await createShowtime(payload);
      await onSaved(payload, response);
    } catch (error) {
      setErrors((current) => ({ ...current, form: error.message || "Không thể lưu suất chiếu." }));
    } finally {
      setSaving(false);
    }
  };

  const errorText = (field) => errors[field] && <span className="mt-1 block text-xs text-rose-300">{errors[field]}</span>;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/75 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="showtime-form-title" className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-slate-700 bg-slate-900 shadow-2xl sm:rounded-3xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-5 py-4 backdrop-blur sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Showtime management</p>
            <h2 id="showtime-form-title" className="mt-1 text-xl font-semibold text-white">{mode === "edit" ? "Chỉnh sửa suất chiếu" : "Tạo suất chiếu"}</h2>
          </div>
          <button type="button" disabled={saving} onClick={onClose} className="rounded-xl border border-slate-700 p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-50" aria-label="Đóng">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={submit} className="space-y-5 p-5 sm:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-slate-300 sm:col-span-2">
              Phim
              <select className={fieldClass} value={form.movieId} onChange={(event) => setField("movieId", event.target.value)}>
                <option value="">Chọn phim</option>
                {catalogs.movies.map((movie) => (
                  <option key={movie.id ?? movie.Id} value={movie.id ?? movie.Id}>
                    {movie.title ?? movie.Title} · {movie.duration ?? movie.Duration} phút
                  </option>
                ))}
              </select>
              {errorText("movieId")}
            </label>

            {selectedMovie && (
              <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-3 sm:col-span-2">
                {selectedMovie.posterUrl || selectedMovie.PosterUrl ? (
                  <img src={selectedMovie.posterUrl ?? selectedMovie.PosterUrl} alt="" className="h-16 w-12 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-16 w-12 items-center justify-center rounded-lg bg-slate-800 text-sky-300"><Film size={20} /></div>
                )}
                <div>
                  <p className="font-medium text-white">{selectedMovie.title ?? selectedMovie.Title}</p>
                  <p className="text-xs text-slate-400">{selectedMovie.duration ?? selectedMovie.Duration} phút · Backend cộng 15 phút chuyển cảnh khi tính giờ kết thúc.</p>
                </div>
              </div>
            )}

            <label className="text-sm text-slate-300">
              Rạp chiếu
              <select className={fieldClass} value={form.cinemaId} onChange={(event) => setForm((current) => ({ ...current, cinemaId: event.target.value, roomId: "" }))}>
                <option value="">Chọn rạp</option>
                {catalogs.cinemas.map((cinema) => <option key={cinema.id ?? cinema.Id} value={cinema.id ?? cinema.Id}>{cinema.name ?? cinema.Name}</option>)}
              </select>
              {errorText("cinemaId")}
            </label>
            <label className="text-sm text-slate-300">
              Phòng chiếu
              <select className={fieldClass} value={form.roomId} disabled={!form.cinemaId} onChange={(event) => setField("roomId", event.target.value)}>
                <option value="">Chọn phòng</option>
                {filteredRooms.map((room) => <option key={room.id ?? room.Id} value={room.id ?? room.Id}>{room.roomName ?? room.RoomName} · {room.roomType ?? room.RoomType}</option>)}
              </select>
              {errorText("roomId")}
            </label>

            <label className="text-sm text-slate-300">
              Ngày chiếu
              <input className={fieldClass} type="date" value={form.showDate} onChange={(event) => setField("showDate", event.target.value)} />
              {errorText("showDate")}
            </label>
            <label className="text-sm text-slate-300">
              Giờ bắt đầu
              <input className={fieldClass} type="time" value={form.startTime} onChange={(event) => setField("startTime", event.target.value)} />
              {errorText("startTime")}
            </label>
            <label className="text-sm text-slate-300">
              Giá vé (₫)
              <input className={fieldClass} type="number" min="0.01" max="99999999.99" step="0.01" inputMode="decimal" value={form.price} onChange={(event) => setField("price", event.target.value)} />
              {errorText("price")}
            </label>
            <label className="text-sm text-slate-300">
              Hệ số ghế VIP
              <input className={fieldClass} type="number" min="0.01" max="999.99" step="0.01" inputMode="decimal" value={form.vipMultiplier} onChange={(event) => setField("vipMultiplier", event.target.value)} />
              {errorText("vipMultiplier")}
            </label>
          </div>

          {form.startTime && selectedMovie && (
            <div className="flex items-start gap-3 rounded-2xl border border-sky-400/20 bg-sky-400/5 p-4 text-sm">
              <Clock3 size={18} className="mt-0.5 shrink-0 text-sky-300" />
              <div>
                <p className="font-medium text-sky-100">Thời lượng {selectedMovie.duration ?? selectedMovie.Duration} phút</p>
                <p className="mt-1 text-slate-300">Kết thúc dự kiến: {endTimePreview || "—"}</p>
                {endTimePreview === "Vượt sang ngày hôm sau" && <p className="mt-1 text-amber-300">Backend không nhận suất chiếu kết thúc sang ngày hôm sau.</p>}
              </div>
            </div>
          )}

          {mode === "edit" && <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-xs leading-5 text-amber-100">Nếu suất đã có booking hoặc ghế đang giữ, backend có thể từ chối thay đổi lịch hoặc phòng. Danh sách ghế không được chỉnh sửa tại đây.</p>}
          {errors.form && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{errors.form}</p>}

          <footer className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:justify-end">
            <button type="button" disabled={saving} onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-50">Đóng</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-wait disabled:opacity-60">
              {saving ? "Đang lưu…" : mode === "edit" ? "Lưu thay đổi" : "Tạo suất chiếu"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
