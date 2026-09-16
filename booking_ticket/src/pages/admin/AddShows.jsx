import { useEffect, useState } from "react";
import { dummyShowsData } from "../../assets/assets";
import { Loading } from "../../components/Loading";
import { Title } from "../../components/admin/Title";
import { CheckIcon, Trash2Icon, StarIcon } from "lucide-react";
import { api } from "../../lib/api";
import toast from "react-hot-toast";

export function AddShows() {
  const [movies, setMovies] = useState([]);
  const [selectedMovieId, setSelectedMovieId] = useState(null);
  const [dateTimeSelection, setDateTimeSelection] = useState({});
  const [dateTimeInput, setDateTimeInput] = useState("");
  const [showPrice, setShowPrice] = useState("75000");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMovies = async () => {
    try {
      const data = await api.get("/api/movies");
      if (Array.isArray(data) && data.length > 0) {
        setMovies(data);
        setSelectedMovieId(data[0].id);
      } else {
        setMovies(dummyShowsData);
        setSelectedMovieId(dummyShowsData[0]._id || dummyShowsData[0].id);
      }
    } catch {
      setMovies(dummyShowsData);
      setSelectedMovieId(dummyShowsData[0]._id || dummyShowsData[0].id);
    } finally {
      setLoading(false);
    }
  };

  const handleDateTimeAdd = () => {
    if (!dateTimeInput) return;
    const [date, time] = dateTimeInput.split("T");
    if (!date || !time) return;

    setDateTimeSelection((prev) => {
      const times = prev[date] || [];
      if (!times.includes(time)) {
        return { ...prev, [date]: [...times, time] };
      }
      return prev;
    });
  };

  const handleRemoveTime = (date, time) => {
    setDateTimeSelection((prev) => {
      const filteredTimes = prev[date].filter((t) => t !== time);
      if (filteredTimes.length === 0) {
        const { [date]: _, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [date]: filteredTimes,
      };
    });
  };

  const handleSubmitShows = async () => {
    if (!selectedMovieId) {
      return toast.error("Vui lòng chọn phim.");
    }
    const dates = Object.keys(dateTimeSelection);
    if (dates.length === 0) {
      return toast.error("Vui lòng thêm ít nhất một thời gian chiếu.");
    }

    setIsSubmitting(true);
    let successCount = 0;

    try {
      for (const d of dates) {
        for (const t of dateTimeSelection[d]) {
          await api.post("/api/admin/shows", {
            movieId: Number(selectedMovieId),
            roomId: 1, // Mặc định phòng 1
            date: d,
            startTime: t.length === 5 ? `${t}:00` : t,
            price: Number(showPrice) || 75000,
          });
          successCount++;
        }
      }

      toast.success(`Đã thêm thành công ${successCount} suất chiếu mới!`);
      setDateTimeSelection({});
      setDateTimeInput("");
    } catch (err) {
      toast.error(err.message || "Có lỗi xảy ra khi tạo suất chiếu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  if (loading) return <Loading />;

  return (
    <>
      <Title text1="Thêm" text2="Suất Chiếu" />

      {/* Select Movie */}
      <p className="mt-8 text-lg font-bold text-white">1. Chọn Phim Chiếu</p>
      <div className="overflow-x-auto pb-4 mt-3">
        <div className="flex gap-4 w-max">
          {movies.map((movie) => {
            const mId = movie.id || movie._id;
            const isSelected = selectedMovieId === mId;
            const poster = movie.posterUrl || movie.poster_path;

            return (
              <div
                key={mId}
                onClick={() => setSelectedMovieId(mId)}
                className={`relative w-40 cursor-pointer rounded-xl overflow-hidden p-2 border transition ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-lg shadow-primary/30"
                    : "border-gray-800 bg-gray-900/60 hover:border-gray-600"
                }`}
              >
                <div className="relative rounded-lg overflow-hidden h-52">
                  <img
                    src={poster}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800";
                    }}
                  />
                  {isSelected && (
                    <div className="absolute top-2 right-2 flex items-center justify-center bg-primary h-6 w-6 rounded-full shadow-md">
                      <CheckIcon className="w-4 h-4 text-white" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <p className="font-semibold text-sm mt-2 text-white truncate">{movie.title}</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {movie.duration ? `${movie.duration} phút` : "120 phút"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Show Price */}
      <div className="mt-8">
        <label className="block text-sm font-semibold text-white mb-2">
          2. Giá Vé Mặc Định (VNĐ)
        </label>
        <div className="inline-flex items-center gap-2 bg-gray-900 border border-gray-700 px-4 py-2.5 rounded-xl">
          <input
            min={0}
            step={5000}
            type="number"
            value={showPrice}
            onChange={(e) => setShowPrice(e.target.value)}
            placeholder="75000"
            className="outline-none bg-transparent text-white font-bold w-40 text-sm"
          />
          <span className="text-primary font-bold text-sm">₫</span>
        </div>
      </div>

      {/* Select Date & Time */}
      <div className="mt-8">
        <label className="block text-sm font-semibold text-white mb-2">
          3. Chọn Ngày & Giờ Chiếu
        </label>
        <div className="inline-flex flex-wrap gap-3 bg-gray-900 border border-gray-700 p-2 rounded-xl">
          <input
            type="datetime-local"
            value={dateTimeInput}
            onChange={(e) => setDateTimeInput(e.target.value)}
            className="outline-none bg-black/50 text-white px-3 py-2 rounded-lg text-sm border border-gray-800"
          />
          <button
            onClick={handleDateTimeAdd}
            className="bg-primary hover:bg-primary-dull text-white px-4 py-2 text-sm font-medium rounded-lg transition cursor-pointer"
          >
            + Thêm Vào Danh Sách
          </button>
        </div>
      </div>

      {/* Selected Time Slots */}
      {Object.keys(dateTimeSelection).length > 0 && (
        <div className="mt-6 max-w-2xl bg-gray-900/60 p-4 rounded-xl border border-white/5">
          <h4 className="text-xs uppercase font-bold text-gray-400 mb-3">
            Các suất chiếu sẽ được tạo:
          </h4>
          <div className="space-y-3">
            {Object.entries(dateTimeSelection).map(([d, times]) => (
              <div key={d} className="flex items-center gap-3">
                <span className="text-sm font-bold text-white min-w-28">{d}:</span>
                <div className="flex flex-wrap gap-2">
                  {times.map((time) => (
                    <div
                      key={time}
                      className="border border-primary/40 bg-primary/10 px-2.5 py-1 flex items-center gap-2 rounded-lg text-xs text-primary font-mono"
                    >
                      <span>{time}</span>
                      <Trash2Icon
                        onClick={() => handleRemoveTime(d, time)}
                        className="w-3.5 h-3.5 text-red-400 hover:text-red-300 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="mt-8">
        <button
          onClick={handleSubmitShows}
          disabled={isSubmitting || Object.keys(dateTimeSelection).length === 0}
          className="bg-primary hover:bg-primary-dull disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold transition shadow-lg shadow-primary/30 cursor-pointer active:scale-95"
        >
          {isSubmitting ? "Đang lưu suất chiếu..." : "Xác Nhận Tạo Suất Chiếu"}
        </button>
      </div>
    </>
  );
}
