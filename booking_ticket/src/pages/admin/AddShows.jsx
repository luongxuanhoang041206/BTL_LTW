import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Clock3, Film, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Loading } from "../../components/Loading";
import { Title } from "../../components/admin/Title";
import { api } from "../../lib/api";

const normalizeArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const parseDateTime = (value) => {
  if (!value) return null;
  const [date, time] = value.split("T");
  if (!date || !time) return null;
  return { date, time };
};

const calculateEndTime = (startTime, durationMinutes) => {
  if (!startTime || !Number.isFinite(Number(durationMinutes))) return "";

  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + Number(durationMinutes);
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;

  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
};

export function AddShows() {
  const [movies, setMovies] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedMovieId, setSelectedMovieId] = useState("");
  const [selectedCinemaId, setSelectedCinemaId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [dateTimeInput, setDateTimeInput] = useState("");
  const [dateTimeSelection, setDateTimeSelection] = useState({});
  const [showPrice, setShowPrice] = useState("75000");
  const [vipMultiplier, setVipMultiplier] = useState("1.2");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        const [moviesResponse, cinemasResponse, roomsResponse] = await Promise.all([
          api.get("/api/admin/movies"),
          api.get("/api/admin/cinemas"),
          api.get("/api/admin/rooms"),
        ]);

        if (!active) return;

        const movieList = normalizeArray(moviesResponse);
        const cinemaList = normalizeArray(cinemasResponse);
        const roomList = normalizeArray(roomsResponse);

        setMovies(movieList);
        setCinemas(cinemaList);
        setRooms(roomList);

        if (movieList.length > 0) {
          setSelectedMovieId(String(movieList[0].id ?? movieList[0].movieId ?? movieList[0].MovieId ?? ""));
        }

        if (cinemaList.length > 0) {
          const firstCinemaId = cinemaList[0].id ?? cinemaList[0].Id ?? cinemaList[0].cinemaId ?? cinemaList[0].CinemaId;
          setSelectedCinemaId(String(firstCinemaId || ""));
        }
      } catch (error) {
        toast.error(error.message || "Không thể tải dữ liệu danh sách phim, rạp và phòng chiếu.");
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, []);

  const selectedMovie = useMemo(
    () => movies.find((movie) => String(movie.id ?? movie.movieId ?? movie.MovieId ?? movie.Id) === String(selectedMovieId)),
    [movies, selectedMovieId],
  );

  const roomOptions = useMemo(() => {
    if (!selectedCinemaId) return rooms;
    return rooms.filter((room) => {
      const cinemaId = room.cinemaId ?? room.CinemaId ?? room.cinema?.id ?? room.Cinema?.id;
      return Number(cinemaId) === Number(selectedCinemaId);
    });
  }, [rooms, selectedCinemaId]);

  const previewEndTime = useMemo(() => {
    const duration = Number(selectedMovie?.duration ?? selectedMovie?.Duration ?? 0);
    const parsed = parseDateTime(dateTimeInput);
    if (!parsed || !duration) return "";
    return calculateEndTime(parsed.time, duration);
  }, [dateTimeInput, selectedMovie]);

  const handleCinemaChange = (nextCinemaId) => {
    setSelectedCinemaId(nextCinemaId);
    setSelectedRoomId("");
  };

  const handleAddTime = () => {
    if (!dateTimeInput) {
      toast.error("Vui lòng chọn ngày và giờ chiếu trước.");
      return;
    }

    const parsed = parseDateTime(dateTimeInput);
    if (!parsed) {
      toast.error("Định dạng thời gian không hợp lệ.");
      return;
    }

    setDateTimeSelection((current) => {
      const times = current[parsed.date] ?? [];
      if (!times.includes(parsed.time)) {
        return { ...current, [parsed.date]: [...times, parsed.time] };
      }
      return current;
    });
    setDateTimeInput("");
  };

  const handleRemoveTime = (date, time) => {
    setDateTimeSelection((current) => {
      const nextTimes = (current[date] ?? []).filter((item) => item !== time);
      if (nextTimes.length === 0) {
        const { [date]: _, ...rest } = current;
        return rest;
      }
      return { ...current, [date]: nextTimes };
    });
  };

  const handleSubmitShows = async (event) => {
    event.preventDefault();

    if (!selectedMovieId) {
      toast.error("Vui lòng chọn phim chiếu.");
      return;
    }

    if (!selectedRoomId) {
      toast.error("Vui lòng chọn phòng chiếu.");
      return;
    }

    const dates = Object.keys(dateTimeSelection);
    if (!dates.length) {
      toast.error("Vui lòng thêm ít nhất một thời gian chiếu.");
      return;
    }

    setSubmitting(true);

    try {
      let createdCount = 0;

      for (const date of dates) {
        for (const time of dateTimeSelection[date]) {
          await api.post("/api/admin/shows", {
            movieId: Number(selectedMovieId),
            roomId: Number(selectedRoomId),
            date,
            startTime: time,
            price: Number(showPrice) || 75000,
            vipMultiplier: Number(vipMultiplier) || 1.2,
          });
          createdCount += 1;
        }
      }

      toast.success(`Đã tạo thành công ${createdCount} suất chiếu mới.`);
      setDateTimeSelection({});
      setDateTimeInput("");
    } catch (error) {
      toast.error(error.message || "Có lỗi xảy ra khi tạo suất chiếu.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      <Title text1="Thêm" text2="Suất Chiếu" />

      <form onSubmit={handleSubmitShows} className="mt-8 space-y-6">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5">
          <div className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
            <Film className="h-5 w-5 text-primary" />
            1. Chọn phim chiếu
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-gray-200">
              <span>Phim</span>
              <select
                value={selectedMovieId}
                onChange={(event) => setSelectedMovieId(event.target.value)}
                className="rounded-lg border border-gray-700 bg-black/50 px-3 py-2.5 text-white"
              >
                {movies.map((movie) => (
                  <option key={movie.id ?? movie.Id ?? movie.movieId ?? movie.MovieId} value={movie.id ?? movie.Id ?? movie.movieId ?? movie.MovieId}>
                    {movie.title ?? movie.Title}
                  </option>
                ))}
              </select>
            </label>

            {selectedMovie && (
              <div className="flex items-center gap-3 rounded-xl border border-gray-700 bg-black/40 p-3">
                {selectedMovie.posterUrl ? (
                  <img src={selectedMovie.posterUrl} alt={selectedMovie.title ?? selectedMovie.Title} className="h-20 w-14 rounded object-cover" />
                ) : (
                  <div className="flex h-20 w-14 items-center justify-center rounded bg-primary/10 text-primary">
                    <Film className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <div className="font-medium text-white">{selectedMovie.title ?? selectedMovie.Title}</div>
                  <div className="text-sm text-gray-400">
                    {selectedMovie.duration ?? selectedMovie.Duration} phút
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5">
          <div className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
            <CalendarPlus className="h-5 w-5 text-primary" />
            2. Chọn rạp và phòng
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-gray-200">
              <span>Rạp chiếu</span>
              <select
                value={selectedCinemaId}
                onChange={(event) => handleCinemaChange(event.target.value)}
                className="rounded-lg border border-gray-700 bg-black/50 px-3 py-2.5 text-white"
              >
                {cinemas.map((cinema) => (
                  <option key={cinema.id ?? cinema.Id} value={cinema.id ?? cinema.Id}>
                    {cinema.name ?? cinema.Name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm text-gray-200">
              <span>Phòng</span>
              <select
                value={selectedRoomId}
                onChange={(event) => setSelectedRoomId(event.target.value)}
                className="rounded-lg border border-gray-700 bg-black/50 px-3 py-2.5 text-white"
              >
                <option value="">Chọn phòng</option>
                {roomOptions.map((room) => (
                  <option key={room.id ?? room.Id} value={room.id ?? room.Id}>
                    {room.roomName ?? room.RoomName}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5">
          <div className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
            <Clock3 className="h-5 w-5 text-primary" />
            3. Thêm lịch chiếu
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
            <label className="flex flex-col gap-1 text-sm text-gray-200">
              <span>Ngày + giờ bắt đầu</span>
              <input
                type="datetime-local"
                value={dateTimeInput}
                onChange={(event) => setDateTimeInput(event.target.value)}
                className="rounded-lg border border-gray-700 bg-black/50 px-3 py-2.5 text-white"
              />
            </label>

            <button
              type="button"
              onClick={handleAddTime}
              className="self-end rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary/90"
            >
              Thêm lịch
            </button>
          </div>

          {Object.keys(dateTimeSelection).length > 0 && (
            <div className="mt-5 space-y-3">
              {Object.entries(dateTimeSelection).map(([date, times]) => (
                <div key={date} className="rounded-xl border border-gray-700 bg-black/30 p-3">
                  <div className="mb-2 font-medium text-white">
                    {new Date(`${date}T00:00:00`).toLocaleDateString("vi-VN")}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {times.map((time) => (
                      <div key={`${date}-${time}`} className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-sm text-primary">
                        {time}
                        <button
                          type="button"
                          onClick={() => handleRemoveTime(date, time)}
                          className="text-primary/80 hover:text-white"
                          aria-label={`Xóa ${time}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5">
          <div className="mb-4 text-lg font-bold text-white">4. Thông tin giá và preview</div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm text-gray-200">
              <span>Giá vé</span>
              <input
                type="number"
                min="0"
                value={showPrice}
                onChange={(event) => setShowPrice(event.target.value)}
                className="rounded-lg border border-gray-700 bg-black/50 px-3 py-2.5 text-white"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-gray-200">
              <span>VIP multiplier</span>
              <input
                type="number"
                step="0.01"
                min="1"
                value={vipMultiplier}
                onChange={(event) => setVipMultiplier(event.target.value)}
                className="rounded-lg border border-gray-700 bg-black/50 px-3 py-2.5 text-white"
              />
            </label>

            <div className="rounded-xl border border-gray-700 bg-black/30 p-3 text-sm text-gray-200">
              <div className="text-xs uppercase tracking-[0.12em] text-gray-400">Preview</div>
              <div className="mt-2 font-medium text-white">{selectedMovie ? `${selectedMovie.duration ?? selectedMovie.Duration} phút` : "—"}</div>
              <div className="text-gray-400">{previewEndTime ? `Kết thúc dự kiến: ${previewEndTime}` : "Chọn thời gian để xem kết thúc dự kiến"}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Đang tạo suất chiếu..." : "Tạo suất chiếu"}
          </button>
        </div>
      </form>
    </>
  );
}
