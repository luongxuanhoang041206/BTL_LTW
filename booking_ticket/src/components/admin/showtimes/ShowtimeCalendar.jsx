import { useMemo, useState } from "react";
import { AlertTriangle, Building2, ChevronDown, ChevronRight, Clapperboard, Film } from "lucide-react";
import { addDays, endMinutes, formatDate, getOverlappingIds, readShowtime, startMinutes, statusClass, statusLabel, startOfWeek } from "./showtimeUtils";

const TRACK_WIDTH = 1440;
const ticks = Array.from({ length: 12 }, (_, index) => index * 120);

function filterEvents(events, keyword) {
  return events.map(readShowtime).filter((showtime) => !keyword || showtime.movieName.toLowerCase().includes(keyword.toLowerCase()));
}

function timelineLanes(events) {
  const laneEnds = [];
  return [...events].sort((a, b) => startMinutes(a) - startMinutes(b) || endMinutes(a) - endMinutes(b)).map((event) => {
    let lane = laneEnds.findIndex((end) => end <= startMinutes(event));
    if (lane < 0) lane = laneEnds.length;
    laneEnds[lane] = endMinutes(event);
    return { event, lane };
  }).map((item) => ({ ...item, laneCount: laneEnds.length }));
}

function ShowtimeBlock({ showtime, overlaps, lane, onClick }) {
  const start = startMinutes(showtime);
  const duration = Math.max(35, endMinutes(showtime) - start);
  return (
    <button
      type="button"
      onClick={() => onClick(showtime)}
      title={`${showtime.movieName} · ${showtime.startTime}–${showtime.endTime} · ${statusLabel(showtime.status)}${overlaps ? " · Trùng lịch trong phòng" : ""}`}
      className={`absolute z-10 flex min-w-0 items-center gap-2 overflow-hidden rounded-lg border px-2 text-left shadow-lg transition hover:z-20 hover:brightness-110 focus:z-20 focus:outline-none focus:ring-2 focus:ring-white/70 ${
        overlaps ? "border-amber-300/80 bg-amber-500/20 ring-1 ring-amber-300/50" : showtime.status === "Active" ? "border-emerald-400/35 bg-emerald-400/15" : showtime.status === "Cancelled" ? "border-rose-400/35 bg-rose-400/15" : "border-violet-400/35 bg-violet-400/15"
      }`}
      style={{ left: `${start}px`, width: `${Math.min(duration, TRACK_WIDTH - start)}px`, top: `${10 + lane * 42}px`, height: "36px" }}
    >
      {showtime.posterUrl ? <img src={showtime.posterUrl} alt="" className="h-7 w-5 shrink-0 rounded object-cover" /> : <Film size={14} className="shrink-0 text-slate-300" />}
      <span className="min-w-0 truncate text-[11px] font-semibold text-white">{showtime.movieName}</span>
      <span className="shrink-0 font-mono text-[10px] text-slate-300">{showtime.startTime}</span>
      {overlaps && <AlertTriangle size={13} className="shrink-0 text-amber-200" />}
    </button>
  );
}

function DayTimeline({ room, date, keyword, onSelect }) {
  const events = filterEvents(room.showtimes ?? room.Showtimes ?? [], keyword).filter((event) => event.showDate === date);
  const overlaps = getOverlappingIds(events);
  const lanes = timelineLanes(events);
  const rowHeight = Math.max(62, (lanes[0]?.laneCount ?? 1) * 42 + 18);

  return (
    <div className="flex border-t border-slate-800/80">
      <div className="sticky left-0 z-20 flex w-48 shrink-0 flex-col justify-center border-r border-slate-800 bg-slate-950 px-3 py-2 sm:w-56">
        <span className="truncate text-sm font-medium text-slate-100">{room.roomName ?? room.RoomName}</span>
        <span className="mt-1 text-[11px] text-slate-500">{room.roomType ?? room.RoomType} · {room.totalSeats ?? room.TotalSeats} ghế</span>
        {overlaps.size > 0 && <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-amber-300"><AlertTriangle size={12} /> Trùng lịch ({overlaps.size})</span>}
      </div>
      <div className="relative shrink-0 bg-slate-950/40" style={{ width: `${TRACK_WIDTH}px`, height: `${rowHeight}px` }}>
        {lanes.map(({ event, lane }) => <ShowtimeBlock key={event.showtimeId} showtime={event} overlaps={overlaps.has(event.showtimeId)} lane={lane} onClick={onSelect} />)}
        {events.length === 0 && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-700">Không có suất chiếu</span>}
      </div>
    </div>
  );
}

function WeekRoom({ room, dates, keyword, onSelect }) {
  const events = filterEvents(room.showtimes ?? room.Showtimes ?? [], keyword);
  return (
    <div className="flex border-t border-slate-800/80">
      <div className="sticky left-0 z-20 flex w-48 shrink-0 flex-col justify-center border-r border-slate-800 bg-slate-950 px-3 py-2 sm:w-56">
        <span className="truncate text-sm font-medium text-slate-100">{room.roomName ?? room.RoomName}</span>
        <span className="mt-1 text-[11px] text-slate-500">{room.roomType ?? room.RoomType} · {room.totalSeats ?? room.TotalSeats} ghế</span>
      </div>
      <div className="grid min-h-[82px] shrink-0 divide-x divide-slate-800" style={{ gridTemplateColumns: `repeat(7, minmax(138px, 1fr))` }}>
        {dates.map((date) => {
          const dayEvents = events.filter((event) => event.showDate === date).sort((a, b) => a.startTime.localeCompare(b.startTime));
          const overlaps = getOverlappingIds(dayEvents);
          return (
            <div key={date} className="space-y-1 p-2">
              {dayEvents.map((event) => (
                <button key={event.showtimeId} type="button" onClick={() => onSelect(event)} className={`flex w-full items-center gap-1 truncate rounded-lg border px-2 py-1.5 text-left text-[10px] ${overlaps.has(event.showtimeId) ? "border-amber-300/70 bg-amber-400/10 text-amber-100" : statusClass(event.status)} hover:brightness-125`} title={`${event.movieName} · ${event.startTime}–${event.endTime}${overlaps.has(event.showtimeId) ? " · Trùng lịch trong phòng" : ""}`}>
                  {overlaps.has(event.showtimeId) && <AlertTriangle size={11} className="shrink-0" />}<span className="shrink-0 font-mono">{event.startTime}</span><span className="truncate">· {event.movieName}</span>
                </button>
              ))}
              {dayEvents.length === 0 && <span className="block px-2 py-2 text-center text-xs text-slate-700">—</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ShowtimeCalendar({ calendar, activeDate, viewMode, keyword, onSelectShowtime }) {
  const [collapsed, setCollapsed] = useState({});
  const cinemas = useMemo(() => calendar?.data ?? calendar?.Data ?? [], [calendar]);
  const dates = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(activeDate), index)), [activeDate]);
  const totalShows = cinemas.reduce((total, cinema) => total + (cinema.rooms ?? cinema.Rooms ?? []).reduce((roomTotal, room) => roomTotal + filterEvents(room.showtimes ?? room.Showtimes ?? [], keyword).length, 0), 0);
  const overlapCount = useMemo(() => cinemas.reduce((total, cinema) => total + (cinema.rooms ?? cinema.Rooms ?? []).reduce((roomTotal, room) => {
    const events = filterEvents(room.showtimes ?? room.Showtimes ?? [], keyword);
    return roomTotal + getOverlappingIds(events).size;
  }, 0), 0), [cinemas, keyword]);

  if (cinemas.length === 0) {
    return <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-14 text-center"><Building2 className="mx-auto h-9 w-9 text-slate-600" /><h3 className="mt-3 font-medium text-white">Chưa có phòng chiếu để hiển thị</h3><p className="mt-1 text-sm text-slate-500">Kiểm tra catalog rạp và phòng chiếu hoặc điều chỉnh bộ lọc.</p></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>{totalShows} suất chiếu {viewMode === "week" ? "trong tuần" : "trong ngày"}</span>
        <span className={`flex items-center gap-1 ${overlapCount ? "text-amber-300" : "text-slate-500"}`}><AlertTriangle size={13} /> {overlapCount ? `${overlapCount} suất có dấu hiệu trùng phòng` : "Không phát hiện suất trùng trong cùng phòng"}</span>
      </div>

      {viewMode === "day" ? (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
          <div className="flex border-b border-slate-800">
            <div className="sticky left-0 z-30 flex w-48 shrink-0 items-center border-r border-slate-800 bg-slate-950 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:w-56">Rạp / Phòng</div>
            <div className="relative h-10 shrink-0 bg-slate-950" style={{ width: `${TRACK_WIDTH}px` }}>
              {ticks.map((minute) => <span key={minute} className="absolute top-3 -translate-x-1/2 font-mono text-[10px] text-slate-500" style={{ left: `${minute}px` }}>{String(Math.floor(minute / 60)).padStart(2, "0")}:00</span>)}
            </div>
          </div>
          <div className="max-h-[65vh] overflow-auto">
            {cinemas.map((cinema) => {
              const cinemaId = cinema.cinemaId ?? cinema.CinemaId;
              const rooms = cinema.rooms ?? cinema.Rooms ?? [];
              const isCollapsed = collapsed[cinemaId] ?? false;
              return (
                <section key={cinemaId}>
                  <button type="button" onClick={() => setCollapsed((current) => ({ ...current, [cinemaId]: !isCollapsed }))} className="sticky left-0 z-20 flex w-full items-center gap-2 border-t border-slate-800 bg-slate-900 px-3 py-2.5 text-left text-sm font-semibold text-white hover:bg-slate-800/80">
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}<Building2 size={15} className="text-sky-300" />{cinema.cinemaName ?? cinema.CinemaName}<span className="ml-auto text-xs font-normal text-slate-500">{rooms.length} phòng</span>
                  </button>
                  {!isCollapsed && rooms.map((room) => <DayTimeline key={room.roomId ?? room.RoomId} room={room} date={activeDate} keyword={keyword} onSelect={onSelectShowtime} />)}
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="overflow-auto rounded-2xl border border-slate-800 bg-slate-950/60">
          <div className="sticky top-0 z-20 flex min-w-max border-b border-slate-800 bg-slate-950">
            <div className="sticky left-0 z-30 flex w-48 shrink-0 items-center border-r border-slate-800 bg-slate-950 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:w-56">Rạp / Phòng</div>
            <div className="grid divide-x divide-slate-800" style={{ gridTemplateColumns: "repeat(7, minmax(138px, 1fr))" }}>
              {dates.map((date) => <div key={date} className={`px-3 py-3 text-center text-xs font-medium ${date === activeDate ? "text-sky-300" : "text-slate-400"}`}>{formatDate(date)}</div>)}
            </div>
          </div>
          {cinemas.map((cinema) => {
            const cinemaId = cinema.cinemaId ?? cinema.CinemaId;
            const rooms = cinema.rooms ?? cinema.Rooms ?? [];
            const isCollapsed = collapsed[cinemaId] ?? false;
            return (
              <section key={cinemaId} className="min-w-max">
                <button type="button" onClick={() => setCollapsed((current) => ({ ...current, [cinemaId]: !isCollapsed }))} className="sticky left-0 z-10 flex w-full items-center gap-2 border-t border-slate-800 bg-slate-900 px-3 py-2.5 text-left text-sm font-semibold text-white hover:bg-slate-800/80">
                  {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}<Building2 size={15} className="text-sky-300" />{cinema.cinemaName ?? cinema.CinemaName}<span className="ml-auto text-xs font-normal text-slate-500">{rooms.length} phòng</span>
                </button>
                {!isCollapsed && rooms.map((room) => <WeekRoom key={room.roomId ?? room.RoomId} room={room} dates={dates} keyword={keyword} onSelect={onSelectShowtime} />)}
              </section>
            );
          })}
          {totalShows === 0 && <div className="py-10 text-center text-sm text-slate-500"><Clapperboard className="mx-auto mb-2 h-7 w-7 text-slate-700" />Không có suất chiếu phù hợp trong tuần này.</div>}
        </div>
      )}
    </div>
  );
}
