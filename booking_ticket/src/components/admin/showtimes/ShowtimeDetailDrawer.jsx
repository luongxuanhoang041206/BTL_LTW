import { CalendarDays, CheckCircle2, Film, MapPin, PencilLine, Ticket, X } from "lucide-react";
import { formatDate, formatTime, readShowtime, statusClass, statusLabel } from "./showtimeUtils";

function Info({ label, value }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 break-words text-sm font-medium text-slate-100">{value || "—"}</p></div>;
}

export function ShowtimeDetailDrawer({ showtime, movie, room, onClose, onEdit, onCancel, onComplete, pending }) {
  if (!showtime) return null;
  const show = readShowtime(showtime);
  const poster = show.posterUrl ?? movie?.posterUrl ?? movie?.PosterUrl;
  const duration = movie?.duration ?? movie?.Duration;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-slate-950/65 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside role="dialog" aria-modal="true" aria-labelledby="showtime-detail-title" className="flex h-full w-full max-w-xl flex-col border-l border-slate-700 bg-slate-900 shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Showtime detail</p>
            <h2 id="showtime-detail-title" className="mt-1 text-xl font-semibold text-white">Suất chiếu #{show.showtimeId}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 hover:text-white" aria-label="Đóng chi tiết"><X size={18} /></button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-7">
          <section className="flex gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            {poster ? <img src={poster} alt="" className="h-28 w-20 shrink-0 rounded-xl object-cover" /> : <div className="flex h-28 w-20 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-sky-300"><Film size={28} /></div>}
            <div className="min-w-0 self-center">
              <p className="text-xs uppercase tracking-wider text-slate-500">Phim</p>
              <h3 className="mt-1 text-lg font-semibold leading-snug text-white">{show.movieName}</h3>
              {duration && <p className="mt-2 text-sm text-slate-400">{duration} phút</p>}
              <span className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(show.status)}`}>{statusLabel(show.status)}</span>
            </div>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><CalendarDays size={16} className="text-sky-300" /> Thông tin suất chiếu</h3>
            <div className="grid grid-cols-2 gap-3">
              <Info label="Ngày chiếu" value={formatDate(show.showDate)} />
              <Info label="Giờ chiếu" value={`${formatTime(show.startTime)} – ${formatTime(show.endTime)}`} />
              <Info label="Rạp" value={show.cinemaName} />
              <Info label="Phòng" value={`${show.roomName}${room?.roomType ? ` · ${room.roomType}` : show.roomType ? ` · ${show.roomType}` : ""}`} />
              <Info label="Giá vé" value={`${show.price.toLocaleString("vi-VN")} ₫`} />
              <Info label="Hệ số VIP" value={`${show.vipMultiplier}×`} />
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500"><MapPin size={14} className="mt-0.5 shrink-0" /> Showtime ID {show.showtimeId} · Ghế và thống kê chỗ ngồi không được trả về bởi API chi tiết hiện tại.</p>
          </section>
        </div>

        <footer className="flex flex-wrap gap-2 border-t border-slate-800 p-5 sm:px-7">
          {show.status === "Active" && <>
            <button type="button" disabled={pending} onClick={() => onEdit(show)} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"><PencilLine size={16} /> Chỉnh sửa</button>
            <button type="button" disabled={pending} onClick={() => onComplete(show)} className="inline-flex items-center gap-2 rounded-xl border border-violet-400/25 bg-violet-400/10 px-4 py-2.5 text-sm font-medium text-violet-200 transition hover:bg-violet-400/20 disabled:opacity-50"><CheckCircle2 size={16} /> Hoàn thành</button>
            <button type="button" disabled={pending} onClick={() => onCancel(show)} className="inline-flex items-center gap-2 rounded-xl border border-rose-400/25 bg-rose-400/10 px-4 py-2.5 text-sm font-medium text-rose-200 transition hover:bg-rose-400/20 disabled:opacity-50"><Ticket size={16} /> Hủy suất</button>
          </>}
          <button type="button" onClick={onClose} className="ml-auto rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white">Đóng</button>
          {show.status === "Active" && <p className="basis-full text-xs leading-5 text-slate-500">Backend sẽ kiểm tra EndTime trước khi hoàn thành và điều kiện booking trước khi lưu.</p>}
        </footer>
      </aside>
    </div>
  );
}
