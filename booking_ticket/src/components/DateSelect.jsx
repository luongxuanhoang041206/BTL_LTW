import { ChevronLeftIcon, ChevronRightIcon, ClockIcon, MapPinIcon, BuildingIcon, CheckIcon } from "lucide-react";
import { BlurCicle } from "./BlurCircle";
import { Fragment, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import { api } from "../lib/api";

export function DateSelect({ dayGroups = [], dateTime = {}, id }) {
  const navigate = useNavigate();

  // -------------------------------------------------------------------------
  // Cinemas state
  // -------------------------------------------------------------------------
  const [cinemas, setCinemas] = useState([]);
  const [selectedCinemaId, setSelectedCinemaId] = useState(null);
  const [cinemasLoading, setCinemasLoading] = useState(true);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [city, setCity] = useState("");
  const [roomType, setRoomType] = useState("");
  const [showtimesError, setShowtimesError] = useState("");
  const [roomTypes, setRoomTypes] = useState([]);

  // -------------------------------------------------------------------------
  // Showtimes state (sau khi chọn rạp)
  // -------------------------------------------------------------------------
  const [currentDayGroups, setCurrentDayGroups] = useState(dayGroups);
  const [showtimesLoading, setShowtimesLoading] = useState(false);

  // Ngày đang chọn — reset khi đổi rạp
  const dates = availableDates.map((item) => item.date);

  // -------------------------------------------------------------------------
  // Load danh sách rạp đang chiếu phim này
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!id) return;
    setCinemasLoading(true);
    const controller = new AbortController();
    setCinemasLoading(true);
    Promise.all([
      api.get(`/api/movies/${id}/cinemas`, { signal: controller.signal }),
      api.get(`/api/movies/${id}/showtimes/dates`, { signal: controller.signal }),
    ])
      .then(([data, dateData]) => {
        setAvailableDates(dateData?.dates ?? []);
        setSelectedDate((previous) => dateData?.dates?.some((item) => item.date === previous)
          ? previous
          : dateData?.dates?.[0]?.date ?? null);
        if (Array.isArray(data) && data.length > 0) {
          setCinemas(data);
          setSelectedCinemaId((previous) => data.some((item) => item.cinemaId === previous)
            ? previous
            : data[0].cinemaId);
        } else {
          setCinemas([]);
          setSelectedCinemaId(null);
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setCinemas([]);
          setAvailableDates([]);
          setSelectedDate(null);
          setShowtimesError("Không thể tải lịch chiếu. Vui lòng thử lại.");
        }
      })
      .finally(() => { if (!controller.signal.aborted) setCinemasLoading(false); });
    return () => controller.abort();
  }, [id]);

  // -------------------------------------------------------------------------
  // Khi đổi rạp → load lại lịch chiếu theo rạp đó
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!id || !selectedDate) {
      setCurrentDayGroups([]);
      return;
    }
    const controller = new AbortController();
    const params = new URLSearchParams({ date: selectedDate });
    if (selectedCinemaId) params.set("cinemaId", selectedCinemaId);
    if (city) params.set("city", city);
    if (roomType) params.set("roomType", roomType);
    setShowtimesLoading(true);
    setShowtimesError("");
    setCurrentDayGroups([]);
    api
      .get(`/api/movies/${id}/showtimes?${params}`, { signal: controller.signal })
      .then((data) => {
        const groups = data?.dayGroups ?? [];
        setCurrentDayGroups(groups);
        setRoomTypes(data?.roomTypes ?? []);
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setCurrentDayGroups([]);
        setShowtimesError("Không thể tải suất chiếu. Vui lòng thử lại.");
      })
      .finally(() => { if (!controller.signal.aborted) setShowtimesLoading(false); });
    return () => controller.abort();
  }, [id, selectedCinemaId, selectedDate, city, roomType]);

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  const currentShowtimes =
    currentDayGroups.find((g) => g.showDate === selectedDate)?.showtimes ?? [];

  const handleSelectShowtime = (showtime) => {
    const showtimeId = showtime.showtimeId || showtime._id || 1;
    navigate(`/movies/${id}/seat/${showtimeId}`);
    scrollTo(0, 0);
  };

  // Fallback cho dummy data (khi không có API)
  const hasApiGroups = availableDates.length > 0;
  const legacyDates = Object.keys(dateTime || {});
  const legacyShowtimes =
    !hasApiGroups && selectedDate ? dateTime[selectedDate] ?? [] : [];

  const handleLegacyBook = () => {
    if (!selectedDate) return toast.error("Vui lòng chọn ngày chiếu");
    navigate(`/movies/${id}/${selectedDate}`);
    scrollTo(0, 0);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div id="dateSelect" className="pt-20">
      <div className="relative p-6 md:p-8 bg-gray-900/90 border border-primary/20 rounded-2xl shadow-xl">
        <BlurCicle top="-100px" left="-100px" />
        <BlurCicle top="100px" right="0" />

        <h2 className="text-xl font-bold text-white mb-6">Đặt Vé</h2>

        {/* ==================================================================
            BƯỚC 1: CHỌN RẠP
        ================================================================== */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">
              1
            </span>
            Chọn Rạp Chiếu Phim
          </p>

          {cinemasLoading ? (
            <div className="flex gap-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 w-48 rounded-xl bg-gray-800/60 animate-pulse"
                />
              ))}
            </div>
          ) : cinemas.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {cinemas.map((cinema) => {
                const isSelected = selectedCinemaId === cinema.cinemaId;
                return (
                  <button
                    key={cinema.cinemaId}
                    onClick={() => setSelectedCinemaId(cinema.cinemaId)}
                    className={`relative flex flex-col items-start px-4 py-3 rounded-xl border transition cursor-pointer text-left min-w-[180px] ${
                      isSelected
                        ? "bg-primary/15 border-primary shadow-lg shadow-primary/20 text-white"
                        : "bg-black/40 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <CheckIcon className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 font-semibold text-sm">
                      <BuildingIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                      {cinema.name}
                    </span>
                    <span className="text-[11px] text-gray-500 mt-1 truncate max-w-[160px]">
                      {cinema.address}
                    </span>
                    <span className="text-[11px] text-primary/80 mt-0.5">
                      {cinema.showtimeCount} suất chiếu
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              Hiện chưa có rạp nào chiếu phim này.
            </p>
          )}
        </div>

        {/* ==================================================================
            BƯỚC 2: CHỌN NGÀY (chỉ hiện khi đã chọn rạp)
        ================================================================== */}
        {availableDates.length > 0 && (
          <div className="mb-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">
                2
              </span>
              Chọn Ngày Chiếu
            </p>

            {showtimesLoading ? (
              <div className="flex gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-20 w-[70px] rounded-xl bg-gray-800/60 animate-pulse"
                  />
                ))}
              </div>
            ) : dates.length > 0 ? (
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                {dates.map((dateStr) => {
                  const dateObj = new Date(dateStr);
                  const isSelected = selectedDate === dateStr;
                  const dayName = dateObj.toLocaleDateString("vi-VN", {
                    weekday: "short",
                  });
                  const dayNum = dateObj.getDate();
                  const monthName = dateObj.toLocaleDateString("vi-VN", {
                    month: "short",
                  });

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`flex flex-col items-center justify-center min-w-[70px] h-20 rounded-xl transition cursor-pointer border ${
                        isSelected
                          ? "bg-primary text-white border-primary shadow-lg shadow-primary/30"
                          : "bg-black/40 border-gray-800 text-gray-400 hover:text-white hover:border-gray-600"
                      }`}
                    >
                      <span className="text-xs uppercase font-medium">{dayName}</span>
                      <span className="text-lg font-bold my-0.5">{dayNum}</span>
                      <span className="text-[11px] opacity-80">{monthName}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                Rạp này không có suất chiếu nào trong thời gian tới.
              </p>
            )}
          </div>
        )}

        {/* ==================================================================
            BƯỚC 3: CHỌN SUẤT CHIẾU (chỉ hiện khi đã chọn ngày)
        ================================================================== */}
        {availableDates.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">
                3
              </span>
              Chọn Suất Chiếu —{" "}
              {new Date(selectedDate).toLocaleDateString("vi-VN", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>

            <div className="flex flex-wrap gap-3 mb-5">
              <label className="text-xs text-gray-400 flex items-center gap-2">Thành phố
                <select value={city} onChange={(event) => setCity(event.target.value)} className="rounded-lg bg-black/50 border border-gray-700 px-3 py-2 text-white">
                  <option value="">Tất cả</option>
                  {[...new Set(cinemas.map((cinema) => cinema.city).filter(Boolean))].map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </label>
              <label className="text-xs text-gray-400 flex items-center gap-2">Định dạng
                <select value={roomType} onChange={(event) => setRoomType(event.target.value)} className="rounded-lg bg-black/50 border border-gray-700 px-3 py-2 text-white">
                  <option value="">Tất cả</option>
                  {roomTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
            </div>
            {showtimesLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-24 rounded-xl bg-gray-800/60 animate-pulse"
                  />
                ))}
              </div>
            ) : showtimesError ? (
              <p className="text-sm text-red-400">{showtimesError}</p>
            ) : currentShowtimes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {currentShowtimes.map((st, index) => (
                    <Fragment key={st.showtimeId}>
                    {(index === 0 || currentShowtimes[index - 1].cinemaId !== st.cinemaId) && (
                      <h3 className="col-span-full text-sm font-semibold text-gray-200 pt-2">
                        {st.cinemaName}{st.city ? ` · ${st.city}` : ""}
                      </h3>
                    )}
                  <div
                    onClick={() => handleSelectShowtime(st)}
                    className="group p-4 rounded-xl bg-black/50 border border-gray-800 hover:border-primary transition cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-white group-hover:text-primary transition flex items-center gap-1.5">
                          <ClockIcon className="w-4 h-4 text-primary" />
                          {st.startTime
                            ? st.startTime.substring(0, 5)
                            : "18:00"}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                          {st.roomType || "2D"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2 flex items-center gap-1 truncate">
                        <MapPinIcon className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        {st.roomName}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between text-xs">
                      <span className="text-gray-400">
                        {st.availableSeats ?? 50} ghế trống
                      </span>
                      <span className="font-bold text-primary">
                        {st.price
                          ? Number(st.price).toLocaleString("vi-VN") + " ₫"
                          : "75.000 ₫"}
                      </span>
                    </div>
                    </div>
                    </Fragment>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                {selectedDate ? "Không có suất chiếu phù hợp với bộ lọc đã chọn." : "Phim hiện chưa có suất chiếu hợp lệ."}
              </p>
            )}
          </div>
        )}

        {/* ==================================================================
            FALLBACK: dummy data khi không có API (legacy)
        ================================================================== */}
        {!selectedCinemaId && cinemas.length === 0 && !cinemasLoading && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Chọn Ngày &amp; Giờ Chiếu
            </p>
            {legacyDates.length > 0 ? (
              <>
                <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none mb-6">
                  {legacyDates.map((dateStr) => {
                    const dateObj = new Date(dateStr);
                    const isSelected = selectedDate === dateStr;
                    return (
                      <button
                        key={dateStr}
                        onClick={() => setSelectedDate(dateStr)}
                        className={`flex flex-col items-center justify-center min-w-[70px] h-20 rounded-xl transition cursor-pointer border ${
                          isSelected
                            ? "bg-primary text-white border-primary"
                            : "bg-black/40 border-gray-800 text-gray-400 hover:text-white"
                        }`}
                      >
                        <span className="text-xs uppercase font-medium">
                          {dateObj.toLocaleDateString("vi-VN", {
                            weekday: "short",
                          })}
                        </span>
                        <span className="text-lg font-bold my-0.5">
                          {dateObj.getDate()}
                        </span>
                        <span className="text-[11px] opacity-80">
                          {dateObj.toLocaleDateString("vi-VN", {
                            month: "short",
                          })}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-3">
                  {legacyShowtimes.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={handleLegacyBook}
                      className="px-4 py-2 rounded-lg bg-black/40 border border-primary/40 hover:bg-primary hover:text-white transition text-sm cursor-pointer"
                    >
                      {item.time || "19:00"}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400">
                Hiện chưa có lịch chiếu cho phim này.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
