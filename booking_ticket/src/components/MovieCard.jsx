import { StarIcon } from "lucide-react";
import { useNavigate } from "react-router";
import timeFormat from "../lib/timeFormat";

export function MovieCard({ movie }) {
  const navigate = useNavigate();

  const id = movie.id || movie._id;
  const poster = movie.posterUrl || movie.backdrop_path || movie.poster_path;
  const releaseYear = movie.releaseDate
    ? new Date(movie.releaseDate).getFullYear()
    : movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : "2025";
  const duration = movie.duration || movie.runtime || 120;
  const genresList = Array.isArray(movie.genres)
    ? movie.genres.slice(0, 2).map((g) => (typeof g === "string" ? g : g.name)).join(" | ")
    : "Hành động";
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "8.5";

  return (
    <div className="flex flex-col justify-between p-3 bg-gray-800/90 border border-white/5 rounded-2xl hover:-translate-y-1.5 hover:border-primary/40 transition duration-300 w-64 shadow-xl">
      <div className="overflow-hidden rounded-xl h-56 w-full bg-gray-900">
        <img
          onClick={() => {
            navigate(`/movies/${id}`);
            scrollTo(0, 0);
          }}
          src={poster}
          alt={movie.title}
          className="h-full w-full object-cover cursor-pointer hover:scale-105 transition duration-300"
          onError={(e) => {
            e.target.src = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=60";
          }}
        />
      </div>

      <p className="font-semibold mt-3 text-white truncate text-base">{movie.title}</p>

      <p className="text-xs text-gray-400 mt-1">
        {releaseYear} &bull; {genresList} &bull; {timeFormat(duration)}
      </p>

      <div className="flex items-center justify-between mt-4 pb-2">
        <button
          onClick={() => {
            navigate(`/movies/${id}`);
            scrollTo(0, 0);
          }}
          className="px-4 py-1.5 text-xs bg-primary hover:bg-primary-dull text-white transition rounded-full font-medium cursor-pointer shadow-md shadow-primary/20 active:scale-95"
        >
          Đặt vé ngay
        </button>
        <p className="flex items-center gap-1 text-xs text-yellow-400 font-medium mt-1 pr-1">
          <StarIcon className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
          {rating}
        </p>
      </div>
    </div>
  );
}
