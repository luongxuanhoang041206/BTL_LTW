import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle, CalendarDays, ChevronLeft, ChevronRight, Clock3,
  LoaderCircle, Plus, RotateCcw, Search, SlidersHorizontal, Table2, TicketCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { ShowtimeCalendar } from "../../components/admin/showtimes/ShowtimeCalendar";
import { ShowtimeDetailDrawer } from "../../components/admin/showtimes/ShowtimeDetailDrawer";
import { ShowtimeFormModal } from "../../components/admin/showtimes/ShowtimeFormModal";
import { ShowtimeList } from "../../components/admin/showtimes/ShowtimeList";
import { Title } from "../../components/admin/Title";
import {
  cancelShowtime, completeShowtime, getAdminShowtime, getAdminShowtimes,
  getShowtimeCalendar, getShowtimeCatalogs,
} from "../../lib/showtimeApi";
import { addDays, formatDate, readShowtime, startOfWeek, toDateInput } from "../../components/admin/showtimes/showtimeUtils";

const today = () => toDateInput(new Date());
const emptyFilters = { cinemaId: "", roomId: "", movieId: "", status: "" };
const controlClass = "h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 outline-none transition focus:border-sky-400";

function ConfirmDialog({ request, busy, onClose, onConfirm }) {
  if (!request) return null;
  const show = readShowtime(request.showtime);
  const cancel = request.type === "cancel";
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/75 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <section role="alertdialog" aria-modal="true" aria-labelledby="confirm-showtime-title" className="w-full max-w-lg rounded-t-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:rounded-3xl sm:p-6">
        <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${cancel ? "bg-rose-400/10 text-rose-300" : "bg-violet-400/10 text-violet-300"}`}>
          {cancel ? <TicketCheck size={20} /> : <Clock3 size={20} />}
        </div>
        <h2 id="confirm-showtime-title" className="text-lg font-semibold text-white">{cancel ? "Hủy suất chiếu này?" : "Đánh dấu suất đã hoàn thành?"}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          <span className="font-medium text-slate-200">{show.movieName}</span> · {show.cinemaName}, {show.roomName} · {formatDate(show.showDate)} · {show.startTime}–{show.endTime}
        </p>
        {cancel ? (
          <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-300/5 p-4 text-sm leading-6 text-rose-100">
            Suất chiếu sẽ ngừng nhận đặt vé. Booking, chi tiết vé và lịch sử thanh toán được giữ lại. Nếu có giao dịch đã thanh toán, hệ thống sẽ yêu cầu xử lý hoàn tiền thủ công; thao tác này không tự hoàn tiền.
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-violet-300/20 bg-violet-300/5 p-4 text-sm leading-6 text-violet-100">
            Backend sẽ xác nhận EndTime đã qua. Nếu chưa đến giờ kết thúc, thao tác sẽ bị từ chối và dữ liệu không đổi.
          </div>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50">Quay lại</button>
          <button type="button" disabled={busy} onClick={onConfirm} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60 ${cancel ? "bg-rose-500 hover:bg-rose-400" : "bg-violet-500 hover:bg-violet-400"}`}>
            {busy && <LoaderCircle size={15} className="animate-spin" />}{busy ? "Đang xử lý…" : cancel ? "Xác nhận hủy" : "Xác nhận hoàn thành"}
          </button>
        </div>
      </section>
    </div>
  );
}

export function ListShows() {
  const [viewMode, setViewMode] = useState("day");
  const [activeDate, setActiveDate] = useState(today);
  const [filters, setFilters] = useState(emptyFilters);
  const [searchInput, setSearchInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [catalogs, setCatalogs] = useState({ movies: [], cinemas: [], rooms: [] });
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [calendar, setCalendar] = useState(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState("");
  const [listResult, setListResult] = useState({ data: [], totalItems: 0, totalPages: 0, currentPage: 1 });
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("startTime");
  const [sortOrder, setSortOrder] = useState("asc");
  const [refreshKey, setRefreshKey] = useState(0);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editor, setEditor] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => getShowtimeCatalogs())
      .then((value) => { if (active) setCatalogs(value); })
      .catch((error) => { if (active) setCatalogError(error.message || "Không thể tải catalog Admin."); })
      .finally(() => { if (active) setCatalogLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setKeyword(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const calendarRange = useMemo(() => {
    if (viewMode === "week") {
      const startDate = startOfWeek(activeDate);
      return { startDate, endDate: addDays(startDate, 6) };
    }
    return { startDate: activeDate, endDate: activeDate };
  }, [activeDate, viewMode]);

  useEffect(() => {
    if (viewMode === "list") return undefined;
    let active = true;
    Promise.resolve()
      .then(() => {
        if (!active) return null;
        setCalendarLoading(true);
        setCalendarError("");
        return getShowtimeCalendar({
          ...calendarRange,
          cinemaId: filters.cinemaId,
          roomId: filters.roomId,
          movieId: filters.movieId,
          status: filters.status,
        });
      })
      .then((result) => { if (active && result) setCalendar(result); })
      .catch((error) => { if (active) { setCalendar(null); setCalendarError(error.message || "Không thể tải lịch chiếu."); } })
      .finally(() => { if (active) setCalendarLoading(false); });
    return () => { active = false; };
  }, [viewMode, calendarRange, filters, refreshKey]);

  useEffect(() => {
    if (viewMode !== "list") return undefined;
    let active = true;
    Promise.resolve()
      .then(() => {
        if (!active) return null;
        setListLoading(true);
        setListError("");
        return getAdminShowtimes({
          ...filters,
          showDate: activeDate,
          keyword,
          page,
          pageSize,
          sortBy,
          sortOrder,
        });
      })
      .then((result) => {
        if (!active || !result) return;
        setListResult({
          data: result?.data ?? result?.Data ?? [],
          totalItems: Number(result?.totalItems ?? result?.TotalItems ?? 0),
          totalPages: Number(result?.totalPages ?? result?.TotalPages ?? 0),
          currentPage: Number(result?.currentPage ?? result?.CurrentPage ?? page),
        });
      })
      .catch((error) => { if (active) { setListResult({ data: [], totalItems: 0, totalPages: 0, currentPage: 1 }); setListError(error.message || "Không thể tải danh sách suất chiếu."); } })
      .finally(() => { if (active) setListLoading(false); });
    return () => { active = false; };
  }, [viewMode, filters, activeDate, keyword, page, pageSize, sortBy, sortOrder, refreshKey]);

  const filteredRooms = useMemo(() => filters.cinemaId
    ? catalogs.rooms.filter((room) => String(room.cinemaId ?? room.CinemaId) === filters.cinemaId)
    : catalogs.rooms, [catalogs.rooms, filters.cinemaId]);

  const selectedMovie = (movieId) => catalogs.movies.find((movie) => String(movie.id ?? movie.Id) === String(movieId));
  const selectedRoom = (roomId) => catalogs.rooms.find((room) => String(room.id ?? room.Id) === String(roomId));

  const refresh = () => setRefreshKey((key) => key + 1);

  const openDetail = async (candidate) => {
    const fallback = readShowtime(candidate);
    const movie = selectedMovie(fallback.movieId);
    const room = selectedRoom(fallback.roomId);
    setDetail({ ...fallback, posterUrl: fallback.posterUrl ?? movie?.posterUrl ?? movie?.PosterUrl, duration: movie?.duration ?? movie?.Duration, roomType: room?.roomType ?? room?.RoomType, totalSeats: room?.totalSeats ?? room?.TotalSeats });
    setDetailLoading(true);
    try {
      const result = await getAdminShowtime(fallback.showtimeId);
      const full = readShowtime(result);
      setDetail({ ...fallback, ...full, posterUrl: fallback.posterUrl ?? movie?.posterUrl ?? movie?.PosterUrl, duration: movie?.duration ?? movie?.Duration, roomType: room?.roomType ?? room?.RoomType, totalSeats: room?.totalSeats ?? room?.TotalSeats });
    } catch (error) {
      toast.error(error.message || "Không thể tải chi tiết suất chiếu.");
    } finally {
      setDetailLoading(false);
    }
  };

  const openEdit = async (candidate) => {
    const fallback = readShowtime(candidate);
    try {
      const result = await getAdminShowtime(fallback.showtimeId);
      setEditor({ mode: "edit", showtime: { ...fallback, ...readShowtime(result) } });
    } catch (error) {
      toast.error(error.message || "Không thể tải thông tin để chỉnh sửa.");
    }
  };

  const onSaved = async (payload) => {
    setEditor(null);
    if (!editor || editor.mode === "create") {
      setActiveDate(payload.date);
      setViewMode("day");
      setPage(1);
    }
    refresh();
    toast.success(editor?.mode === "edit" ? "Đã cập nhật suất chiếu." : "Đã tạo suất chiếu và khởi tạo ghế.");
  };

  const runLifecycleAction = async () => {
    if (!confirmation) return;
    setActionBusy(true);
    try {
      const result = confirmation.type === "cancel"
        ? await cancelShowtime(readShowtime(confirmation.showtime).showtimeId)
        : await completeShowtime(readShowtime(confirmation.showtime).showtimeId);
      setConfirmation(null);
      setDetail(null);
      refresh();
      if (result?.requiresManualRefund) toast(result.message || "Đã hủy suất; cần xử lý hoàn tiền thủ công.", { icon: "⚠️", duration: 6000 });
      else toast.success(result?.message || (confirmation.type === "cancel" ? "Đã hủy suất chiếu." : "Đã hoàn thành suất chiếu."));
    } catch (error) {
      toast.error(error.message || "Không thể cập nhật suất chiếu.");
    } finally {
      setActionBusy(false);
    }
  };

  const resetFilters = () => {
    setFilters(emptyFilters);
    setSearchInput("");
    setKeyword("");
    setActiveDate(today());
    setPage(1);
  };

  const changeDate = (date) => {
    setPage(1);
    setActiveDate(date);
  };
  const moveCalendar = (amount) => {
    setPage(1);
    setActiveDate((date) => addDays(date, amount * (viewMode === "week" ? 7 : 1)));
  };
  const changeSort = (key) => {
    setPage(1);
    if (sortBy === key) setSortOrder((order) => order === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortOrder("asc"); }
  };

  const roomOptions = filteredRooms;
  const rangeLabel = viewMode === "week"
    ? `${formatDate(calendarRange.startDate)} – ${formatDate(calendarRange.endDate)}`
    : formatDate(activeDate);

  return (
    <main className="mx-auto max-w-[1600px] pb-10 text-slate-100">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-300"><CalendarDays size={15} /> Lịch vận hành</div>
          <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-1"><Title text1="Showtime" text2="Management" /><span className="pb-1 text-sm text-slate-500">Lên lịch, theo dõi và cập nhật vòng đời suất chiếu.</span></div>
        </div>
        <button type="button" disabled={catalogLoading || Boolean(catalogError)} onClick={() => setEditor({ mode: "create", showtime: null })} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-950/30 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50">
          <Plus size={17} /> Tạo suất chiếu
        </button>
      </header>

      {catalogError && <div className="mt-5 flex items-center gap-2 rounded-xl border border-rose-300/20 bg-rose-300/5 px-4 py-3 text-sm text-rose-200"><AlertCircle size={16} />{catalogError}<button type="button" onClick={() => window.location.reload()} className="ml-auto underline">Tải lại</button></div>}

      <section className="mt-7 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl shadow-black/10 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => moveCalendar(-1)} className="rounded-xl border border-slate-700 p-2 text-slate-300 hover:bg-slate-800" aria-label="Khoảng trước"><ChevronLeft size={17} /></button>
            <button type="button" onClick={() => changeDate(today())} className="h-10 rounded-xl border border-slate-700 px-3 text-sm font-medium text-slate-200 hover:bg-slate-800">Hôm nay</button>
            <button type="button" onClick={() => moveCalendar(1)} className="rounded-xl border border-slate-700 p-2 text-slate-300 hover:bg-slate-800" aria-label="Khoảng sau"><ChevronRight size={17} /></button>
            <label className="relative">
              <span className="sr-only">Chọn ngày</span>
              <CalendarDays size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="date" value={activeDate} onChange={(event) => event.target.value && changeDate(event.target.value)} className={`${controlClass} pl-9`} />
            </label>
            <span className="ml-1 text-sm font-medium text-white">{rangeLabel}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-slate-700 bg-slate-950 p-1">
              <button type="button" onClick={() => setViewMode("day")} className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${viewMode === "day" ? "bg-sky-400/15 text-sky-200" : "text-slate-400 hover:text-white"}`}><CalendarDays size={14} /> Ngày</button>
              <button type="button" onClick={() => setViewMode("week")} className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${viewMode === "week" ? "bg-sky-400/15 text-sky-200" : "text-slate-400 hover:text-white"}`}><SlidersHorizontal size={14} /> Tuần</button>
              <button type="button" onClick={() => setViewMode("list")} className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${viewMode === "list" ? "bg-sky-400/15 text-sky-200" : "text-slate-400 hover:text-white"}`}><Table2 size={14} /> Danh sách</button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.3fr)_repeat(4,minmax(130px,1fr))_auto]">
          <label className="relative">
            <span className="sr-only">Tìm theo tên phim</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Tìm tên phim…" className={`${controlClass} w-full pl-9`} />
          </label>
          <label className="sr-only" htmlFor="showtime-cinema-filter">Rạp</label>
          <select id="showtime-cinema-filter" value={filters.cinemaId} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, cinemaId: event.target.value, roomId: "" })); }} className={controlClass}>
            <option value="">Tất cả rạp</option>{catalogs.cinemas.map((cinema) => <option key={cinema.id ?? cinema.Id} value={cinema.id ?? cinema.Id}>{cinema.name ?? cinema.Name}</option>)}
          </select>
          <label className="sr-only" htmlFor="showtime-room-filter">Phòng</label>
          <select id="showtime-room-filter" value={filters.roomId} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, roomId: event.target.value })); }} disabled={catalogLoading} className={`${controlClass} disabled:opacity-50`}>
            <option value="">Tất cả phòng</option>{roomOptions.map((room) => <option key={room.id ?? room.Id} value={room.id ?? room.Id}>{room.roomName ?? room.RoomName}</option>)}
          </select>
          <label className="sr-only" htmlFor="showtime-movie-filter">Phim</label>
          <select id="showtime-movie-filter" value={filters.movieId} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, movieId: event.target.value })); }} className={controlClass}>
            <option value="">Tất cả phim</option>{catalogs.movies.map((movie) => <option key={movie.id ?? movie.Id} value={movie.id ?? movie.Id}>{movie.title ?? movie.Title}</option>)}
          </select>
          <label className="sr-only" htmlFor="showtime-status-filter">Trạng thái</label>
          <select id="showtime-status-filter" value={filters.status} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, status: event.target.value })); }} className={controlClass}>
            <option value="">Tất cả trạng thái</option><option value="Active">Đang mở bán</option><option value="Cancelled">Đã hủy</option><option value="Finished">Đã hoàn thành</option>
          </select>
          <button type="button" onClick={resetFilters} title="Xóa bộ lọc" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-700 px-3 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"><RotateCcw size={15} /><span className="xl:hidden">Reset</span></button>
        </div>
      </section>

      <section className="mt-5">
        {viewMode !== "list" && <>
          {calendarError && <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-300/20 bg-rose-300/5 px-4 py-3 text-sm text-rose-200"><AlertCircle size={16} />{calendarError}<button type="button" onClick={refresh} className="ml-auto underline">Thử lại</button></div>}
          {calendarLoading ? <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">{[0, 1, 2, 3].map((key) => <div key={key} className="h-16 animate-pulse rounded-xl bg-slate-800/70" />)}</div> : !calendarError && <ShowtimeCalendar calendar={calendar} activeDate={activeDate} viewMode={viewMode} keyword={keyword} onSelectShowtime={openDetail} />}
        </>}

        {viewMode === "list" && <>
          {listError && <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-300/20 bg-rose-300/5 px-4 py-3 text-sm text-rose-200"><AlertCircle size={16} />{listError}<button type="button" onClick={refresh} className="ml-auto underline">Thử lại</button></div>}
          <ShowtimeList
            data={listResult.data} page={page} pageSize={pageSize} totalItems={listResult.totalItems} totalPages={listResult.totalPages}
            sortBy={sortBy} sortOrder={sortOrder} loading={listLoading} onPageChange={(nextPage, nextSize) => { setPage(nextPage); if (nextSize) setPageSize(nextSize); }}
            onSortChange={changeSort} onSelectShowtime={openDetail} onEdit={openEdit}
            onCancel={(show) => setConfirmation({ type: "cancel", showtime: show })}
            onComplete={(show) => setConfirmation({ type: "complete", showtime: show })}
          />
        </>}
      </section>

      {detailLoading && detail && <div className="fixed right-4 top-20 z-[61] inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300 shadow-lg"><LoaderCircle size={14} className="animate-spin" />Đang tải chi tiết…</div>}
      {detail && <ShowtimeDetailDrawer
        showtime={detail} movie={selectedMovie(detail.movieId)} room={selectedRoom(detail.roomId)} pending={actionBusy}
        onClose={() => setDetail(null)} onEdit={(show) => { setDetail(null); openEdit(show); }}
        onCancel={(show) => setConfirmation({ type: "cancel", showtime: show })}
        onComplete={(show) => setConfirmation({ type: "complete", showtime: show })}
      />}

      {editor && <ShowtimeFormModal
        mode={editor.mode} showtime={editor.showtime} catalogs={catalogs}
        onClose={() => setEditor(null)} onSaved={onSaved}
      />}
      <ConfirmDialog request={confirmation} busy={actionBusy} onClose={() => !actionBusy && setConfirmation(null)} onConfirm={runLifecycleAction} />
    </main>
  );
}
