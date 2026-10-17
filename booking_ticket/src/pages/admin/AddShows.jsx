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
  const [vipMultiplier, setVipMultiplier] = useState("1.25");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreateMovie, setShowCreateMovie] = useState(false);
  const [genres, setGenres] = useState([]);
  const [isCreatingMovie, setIsCreatingMovie] = useState(false);
  const [movieForm, setMovieForm] = useState({
    title: "", description: "", duration: "", releaseDate: "", endDate: "",
    posterUrl: "", trailerUrl: "", director: "", actors: "", language: "",
    ageRating: "", status: "Coming Soon", genreIds: [],
  });

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

  const handleCreateMovie = async (event) => {
    event.preventDefault();
    if (!movieForm.title.trim() || Number(movieForm.duration) < 1) {
      return toast.error("Vui lòng nhập tên phim và thời lượng hợp lệ.");
    }

    setIsCreatingMovie(true);
    try {
      const result = await api.post("/api/admin/movies", {
        ...movieForm,
        title: movieForm.title.trim(),
        duration: Number(movieForm.duration),
        releaseDate: movieForm.releaseDate || null,
        endDate: movieForm.endDate || null,
      });
      const created = await api.get(`/api/movies/${result.movieId}`);
      setMovies((current) => [created, ...current.filter((movie) => Number(movie.id || movie._id) !== Number(created.id))]);
      setSelectedMovieId(created.id);
      setShowCreateMovie(false);
      setDateTimeSelection({});
      toast.success("Đã tạo phim. Phim đã được thêm vào danh sách chọn phim chiếu.");
      setMovieForm({ title: "", description: "", duration: "", releaseDate: "", endDate: "", posterUrl: "", trailerUrl: "", director: "", actors: "", language: "", ageRating: "", status: "Coming Soon", genreIds: [] });
    } catch (err) {
      toast.error(err.message || "Không thể tạo phim.");
    } finally {
      setIsCreatingMovie(false);
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
            vipMultiplier: Number(vipMultiplier) || 1.2,
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
    api.get("/api/movies/genres").then(setGenres).catch(() => setGenres([]));
  }, []);

  if (loading) return <Loading />;

  return (
    <>
      <Title text1="Thêm" text2="Suất Chiếu" />

      {/* Select Movie */}
      <p className="mt-8 text-lg font-bold text-white">1. Chọn Phim Chiếu</p>
      <div className="flex flex-wrap gap-3 mt-3 mb-4">
        <button type="button" onClick={() => setShowCreateMovie(false)} className={`px-4 py-2 rounded-lg text-sm font-semibold ${!showCreateMovie ? "bg-primary text-white" : "bg-gray-900 text-gray-300 border border-gray-700"}`}>
          Chọn phim có sẵn
        </button>
        <button type="button" onClick={() => setShowCreateMovie(true)} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${showCreateMovie ? "bg-primary text-white" : "bg-gray-900 text-gray-300 border border-gray-700"}`}>
          <PlusIcon className="w-4 h-4" /> Tạo phim mới
        </button>
      </div>

      {showCreateMovie ? (
        <form onSubmit={handleCreateMovie} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl rounded-xl border border-gray-800 bg-gray-900/70 p-5">
          <label className="text-sm text-gray-300">Tên phim *<input required maxLength={200} value={movieForm.title} onChange={(e) => setMovieForm({ ...movieForm, title: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-700 bg-black/50 px-3 py-2 text-white" /></label>
          <label className="text-sm text-gray-300">Thời lượng (phút) *<input required type="number" min="1" max="500" value={movieForm.duration} onChange={(e) => setMovieForm({ ...movieForm, duration: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-700 bg-black/50 px-3 py-2 text-white" /></label>
          <label className="text-sm text-gray-300 md:col-span-2">Mô tả<textarea rows={3} value={movieForm.description} onChange={(e) => setMovieForm({ ...movieForm, description: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-700 bg-black/50 px-3 py-2 text-white" /></label>
          <label className="text-sm text-gray-300">URL ảnh poster<input type="url" value={movieForm.posterUrl} onChange={(e) => setMovieForm({ ...movieForm, posterUrl: e.target.value })} placeholder="https://..." className="mt-1 w-full rounded-lg border border-gray-700 bg-black/50 px-3 py-2 text-white" /></label>
          <label className="text-sm text-gray-300">URL trailer<input type="url" value={movieForm.trailerUrl} onChange={(e) => setMovieForm({ ...movieForm, trailerUrl: e.target.value })} placeholder="https://..." className="mt-1 w-full rounded-lg border border-gray-700 bg-black/50 px-3 py-2 text-white" /></label>
          <label className="text-sm text-gray-300">Đạo diễn<input value={movieForm.director} onChange={(e) => setMovieForm({ ...movieForm, director: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-700 bg-black/50 px-3 py-2 text-white" /></label>
          <label className="text-sm text-gray-300">Diễn viên<input value={movieForm.actors} onChange={(e) => setMovieForm({ ...movieForm, actors: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-700 bg-black/50 px-3 py-2 text-white" /></label>
          <label className="text-sm text-gray-300">Ngôn ngữ<input value={movieForm.language} onChange={(e) => setMovieForm({ ...movieForm, language: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-700 bg-black/50 px-3 py-2 text-white" /></label>
          <label className="text-sm text-gray-300">Phân loại độ tuổi<input value={movieForm.ageRating} onChange={(e) => setMovieForm({ ...movieForm, ageRating: e.target.value })} placeholder="P, C13, C16, C18" className="mt-1 w-full rounded-lg border border-gray-700 bg-black/50 px-3 py-2 text-white" /></label>
          <label className="text-sm text-gray-300">Ngày khởi chiếu<input type="date" value={movieForm.releaseDate} onChange={(e) => setMovieForm({ ...movieForm, releaseDate: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-700 bg-black/50 px-3 py-2 text-white" /></label>
          <label className="text-sm text-gray-300">Ngày kết thúc<input type="date" value={movieForm.endDate} onChange={(e) => setMovieForm({ ...movieForm, endDate: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-700 bg-black/50 px-3 py-2 text-white" /></label>
          <label className="text-sm text-gray-300">Trạng thái<select value={movieForm.status} onChange={(e) => setMovieForm({ ...movieForm, status: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-700 bg-black/50 px-3 py-2 text-white"><option value="Coming Soon">Sắp chiếu</option><option value="Showing">Đang chiếu</option></select></label>
          <fieldset className="md:col-span-2"><legend className="text-sm text-gray-300 mb-2">Thể loại</legend><div className="flex flex-wrap gap-3">{genres.map((genre) => <label key={genre.id} className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={movieForm.genreIds.includes(genre.id)} onChange={(e) => setMovieForm({ ...movieForm, genreIds: e.target.checked ? [...movieForm.genreIds, genre.id] : movieForm.genreIds.filter((id) => id !== genre.id) })} />{genre.name}</label>)}</div></fieldset>
          <div className="md:col-span-2 flex gap-3"><button disabled={isCreatingMovie} className="rounded-lg bg-primary px-5 py-2 font-semibold text-white disabled:opacity-50">{isCreatingMovie ? "Đang tạo phim..." : "Tạo phim và thêm vào danh sách"}</button><button type="button" onClick={() => setShowCreateMovie(false)} className="rounded-lg border border-gray-700 px-5 py-2 text-gray-300">Hủy</button></div>
        </form>
      ) : (
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
      )}

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
