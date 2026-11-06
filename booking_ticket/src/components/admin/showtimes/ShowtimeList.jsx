import { ArrowDownWideNarrow, ArrowUpDown, CheckCircle2, ChevronLeft, ChevronRight, Eye, PencilLine, TicketX } from "lucide-react";
import { formatDate, readShowtime, statusClass, statusLabel } from "./showtimeUtils";

export function ShowtimeList({ data, page, pageSize, totalItems, totalPages, sortBy, sortOrder, loading, onPageChange, onSortChange, onSelectShowtime, onEdit, onCancel, onComplete }) {
  const rows = data.map(readShowtime);
  const sortButton = (label, key) => (
    <button type="button" onClick={() => onSortChange(key)} className="inline-flex items-center gap-1.5 whitespace-nowrap hover:text-white" aria-label={`Sắp xếp theo ${label}`}>
      {label}{sortBy === key ? (sortOrder === "asc" ? <ArrowDownWideNarrow size={13} /> : <ArrowUpDown size={13} />) : <ArrowUpDown size={13} className="opacity-40" />}
    </button>
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3 text-xs text-slate-400 sm:px-5">
        <span>{totalItems} kết quả · Trang {page} / {Math.max(totalPages, 1)}</span>
        <label className="flex items-center gap-2">Hiển thị
          <select value={pageSize} onChange={(event) => onPageChange(1, Number(event.target.value))} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200">
            {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="space-y-3 p-5" aria-label="Đang tải danh sách suất chiếu">
          {[0, 1, 2, 3, 4].map((item) => <div key={item} className="h-12 animate-pulse rounded-xl bg-slate-800/70" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="px-5 py-14 text-center"><TicketX className="mx-auto h-9 w-9 text-slate-600" /><h3 className="mt-3 font-medium text-white">Không tìm thấy suất chiếu</h3><p className="mt-1 text-sm text-slate-500">Thử đổi bộ lọc hoặc tạo một suất chiếu mới.</p></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[1060px] w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">ID</th><th className="px-4 py-3">Phim</th><th className="px-4 py-3">Rạp / Phòng</th>
                <th className="px-4 py-3">{sortButton("Ngày chiếu", "showDate")}</th><th className="px-4 py-3">{sortButton("Bắt đầu", "startTime")}</th>
                <th className="px-4 py-3">Kết thúc</th><th className="px-4 py-3">{sortButton("Giá vé", "price")}</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {rows.map((show) => (
                <tr key={show.showtimeId} className="transition hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">#{show.showtimeId}</td>
                  <td className="px-4 py-3"><button type="button" onClick={() => onSelectShowtime(show)} className="max-w-[250px] truncate text-left font-medium text-white hover:text-sky-300">{show.movieName}</button></td>
                  <td className="px-4 py-3"><p className="text-slate-200">{show.cinemaName}</p><p className="mt-0.5 text-xs text-slate-500">{show.roomName}</p></td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-300">{formatDate(show.showDate)}</td>
                  <td className="px-4 py-3 font-mono text-slate-200">{show.startTime}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">{show.endTime}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-200">{show.price.toLocaleString("vi-VN")} ₫</td>
                  <td className="px-4 py-3"><span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusClass(show.status)}`}>{statusLabel(show.status)}</span></td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-1.5">
                    <button type="button" onClick={() => onSelectShowtime(show)} title="Xem chi tiết" className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-sky-400/40 hover:text-sky-200"><Eye size={15} /></button>
                    {show.status === "Active" && <>
                      <button type="button" onClick={() => onEdit(show)} title="Chỉnh sửa" className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-sky-400/40 hover:text-white"><PencilLine size={15} /></button>
                      <button type="button" onClick={() => onComplete(show)} title="Hoàn thành (backend kiểm tra EndTime)" className="rounded-lg border border-violet-400/20 p-2 text-violet-200 hover:bg-violet-400/10"><CheckCircle2 size={15} /></button>
                      <button type="button" onClick={() => onCancel(show)} title="Hủy suất chiếu" className="rounded-lg border border-rose-400/20 p-2 text-rose-200 hover:bg-rose-400/10"><TicketX size={15} /></button>
                    </>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && totalPages > 1 && <footer className="flex items-center justify-between border-t border-slate-800 px-4 py-3 sm:px-5">
        <p className="text-xs text-slate-500">{Math.min((page - 1) * pageSize + 1, totalItems)}–{Math.min(page * pageSize, totalItems)} / {totalItems}</p>
        <div className="flex gap-2">
          <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Trang trước"><ChevronLeft size={16} /></button>
          <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Trang sau"><ChevronRight size={16} /></button>
        </div>
      </footer>}
    </section>
  );
}
