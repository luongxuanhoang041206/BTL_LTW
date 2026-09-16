import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { dummyDateTimeData, dummyShowsData } from "../assets/assets";
import { BlurCicle } from "../components/BlurCircle";
import { Heart, PlayCircleIcon, StarIcon, ClockIcon, CalendarIcon, FilmIcon, XIcon } from "lucide-react";
import timeFormat from "../lib/timeFormat";
import { DateSelect } from "../components/DateSelect";
import { MovieCard } from "../components/MovieCard";
import { Loading } from "../components/Loading";
import { api } from "../lib/api";
import toast from "react-hot-toast";

export function MovieDetails() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [showtimesData, setShowtimesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMovieData = async () => {
      setLoading(true);
      try {
        const [movieRes, showtimesRes] = await Promise.all([
          api.get(`/api/movies/${id}`).catch(() => null),
          api.get(`/api/movies/${id}/showtimes`).catch(() => null),
        ]);

        if (movieRes) {
          setMovie(movieRes);
          setShowtimesData(showtimesRes);
        } else {
          // Fallback dummy
          const dummy = dummyShowsData.find((s) => s._id === id || s.id === Number(id));
          if (dummy) {
            setMovie({
              id: dummy._id,
              title: dummy.title,
              overview: dummy.overview,
              description: dummy.overview,
              posterUrl: dummy.poster_path,
              backdropUrl: dummy.backdrop_path,
              duration: dummy.runtime,
              releaseDate: dummy.release_date,
              genres: dummy.genres,
              vote_average: dummy.vote_average,
              casts: dummy.casts,
            });
            setShowtimesData({ dayGroups: [] });
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMovieData();
  }, [id]);

  if (loading) return <Loading />;
  if (!movie) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Không tìm thấy thông tin phim</h2>
        <button
          onClick={() => navigate("/movies")}
          className="px-6 py-2 bg-primary text-white rounded-full font-medium"
        >
          Quay lại danh sách phim
        </button>
      </div>
    );
  }

  const poster = movie.posterUrl || movie.poster_path || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800";
  const duration = movie.duration || movie.runtime || 120;
  const genresStr = Array.isArray(movie.genres)
    ? movie.genres.map((g) => (typeof g === "string" ? g : g.name)).join(", ")
    : "Hành động, Phiêu lưu";
  const releaseYear = movie.releaseDate
    ? new Date(movie.releaseDate).getFullYear()
    : "2025";
  const trailerUrl = movie.trailerUrl || "https://www.youtube.com/watch?v=WpW36ldAqnM";

  return (
    <div className="px-6 md:px-16 lg:px-40 pt-32 md:pt-40 min-h-screen">
      {/* Trailer Modal */}
      {isTrailerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative w-full max-w-4xl bg-gray-900 rounded-2xl overflow-hidden border border-primary/40 shadow-2xl">
            <button
              onClick={() => setIsTrailerOpen(false)}
              className="absolute top-4 right-4 z-10 text-white bg-black/60 p-2 rounded-full hover:bg-primary transition cursor-pointer"
            >
              <XIcon className="w-6 h-6" />
            </button>
            <div className="aspect-video w-full">
              <iframe
                src={trailerUrl.replace("watch?v=", "embed/") + "?autoplay=1"}
                title={movie.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* Movie Details Hero */}
      <div className="flex flex-col md:flex-row gap-10 max-w-6xl mx-auto">
        <div className="shrink-0 max-md:mx-auto">
          <img
            src={poster}
            alt={movie.title}
            className="rounded-2xl h-110 w-76 object-cover shadow-2xl shadow-primary/20 border border-white/10"
            onError={(e) => {
              e.target.src = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800";
            }}
          />
        </div>

        <div className="relative flex flex-col justify-center gap-4">
          <BlurCicle top="-100px" left="-100px" />
          <span className="text-primary text-xs tracking-widest font-bold uppercase">
            Phim Đang Chiếu Rạp
          </span>

          <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight">
            {movie.title}
          </h1>

          <div className="flex items-center gap-4 text-gray-300 text-sm">
            <span className="flex items-center gap-1 text-yellow-400 font-semibold">
              <StarIcon className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              {movie.vote_average ? movie.vote_average.toFixed(1) : "8.8"} / 10
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <ClockIcon className="w-4 h-4 text-gray-400" />
              {timeFormat(duration)}
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <CalendarIcon className="w-4 h-4 text-gray-400" />
              {releaseYear}
            </span>
          </div>

          <p className="text-gray-300 text-sm leading-relaxed max-w-xl">
            {movie.description || movie.overview || "Bộ phim điện ảnh đặc sắc mang lại cho bạn những trải nghiệm cảm xúc bùng nổ tại rạp."}
          </p>

          <div className="text-sm text-gray-400 space-y-1">
            <p><strong className="text-gray-200">Thể loại:</strong> {genresStr}</p>
            {movie.director && <p><strong className="text-gray-200">Đạo diễn:</strong> {movie.director}</p>}
            {movie.actors && <p><strong className="text-gray-200">Diễn viên:</strong> {movie.actors}</p>}
            {movie.language && <p><strong className="text-gray-200">Ngôn ngữ:</strong> {movie.language}</p>}
          </div>

          <div className="flex items-center flex-wrap gap-4 mt-4">
            <button
              onClick={() => setIsTrailerOpen(true)}
              className="flex items-center gap-2 px-6 py-3 text-sm bg-gray-800 hover:bg-gray-700 text-white transition rounded-xl font-medium cursor-pointer active:scale-95 border border-white/10"
            >
              <PlayCircleIcon className="w-5 h-5 text-primary" />
              Xem Trailer
            </button>
            <a
              href="#dateSelect"
              className="px-8 py-3 text-sm bg-primary hover:bg-primary-dull text-white transition rounded-xl font-semibold cursor-pointer shadow-lg shadow-primary/30 active:scale-95"
            >
              Đặt Vé Ngay
            </a>
            <button
              onClick={() => toast.success("Đã thêm vào danh sách yêu thích!")}
              className="bg-gray-800/80 hover:bg-gray-700 p-3 rounded-xl transition cursor-pointer text-gray-400 hover:text-red-500 border border-white/10"
            >
              <Heart className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Date & Showtime Selector */}
      <DateSelect
        dayGroups={showtimesData?.dayGroups || []}
        dateTime={dummyDateTimeData}
        id={id}
      />

      {/* Similar Movies */}
      <div className="my-24">
        <p className="text-2xl font-bold text-white mb-8">Có thể bạn sẽ thích</p>
        <div className="flex flex-wrap max-sm:justify-center gap-8">
          {dummyShowsData.slice(0, 4).map((m) => (
            <MovieCard key={m._id} movie={m} />
          ))}
        </div>
      </div>
    </div>
  );
}
