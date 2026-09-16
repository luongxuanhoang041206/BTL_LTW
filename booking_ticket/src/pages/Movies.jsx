import { useEffect, useState } from "react";
import { dummyShowsData } from "../assets/assets";
import { BlurCicle } from "../components/BlurCircle";
import { MovieCard } from "../components/MovieCard";
import { Loading } from "../components/Loading";
import { api } from "../lib/api";
import { SearchIcon, FilterIcon } from "lucide-react";

export function Movies() {
  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [moviesData, genresData] = await Promise.all([
          api.get("/api/movies"),
          api.get("/api/movies/genres").catch(() => []),
        ]);

        if (moviesData && moviesData.length > 0) {
          setMovies(moviesData);
        } else {
          setMovies(dummyShowsData);
        }

        if (genresData && genresData.length > 0) {
          setGenres(genresData);
        }
      } catch {
        setMovies(dummyShowsData);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredMovies = movies.filter((m) => {
    const matchSearch = searchTerm
      ? m.title.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    const matchGenre =
      selectedGenre === "all"
        ? true
        : m.genres?.some((g) =>
            (typeof g === "string" ? g : g.name).toLowerCase() === selectedGenre.toLowerCase()
          );
    return matchSearch && matchGenre;
  });

  return (
    <div className="relative my-32 mb-40 px-6 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[85vh]">
      <BlurCicle top="100px" left="0" />
      <BlurCicle bottom="50px" right="50px" />

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 my-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Danh Sách Phim</h1>
          <p className="text-gray-400 text-sm mt-1">Lựa chọn bộ phim yêu thích và đặt vé ngay hôm nay</p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm tên phim..."
            className="w-full bg-gray-900 border border-gray-700 rounded-full pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary transition"
          />
        </div>
      </div>

      {/* Genre Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 text-sm scrollbar-none">
        <button
          onClick={() => setSelectedGenre("all")}
          className={`px-4 py-1.5 rounded-full whitespace-nowrap transition cursor-pointer ${
            selectedGenre === "all"
              ? "bg-primary text-white shadow-md shadow-primary/30 font-medium"
              : "bg-gray-800/80 text-gray-400 hover:text-white border border-white/5"
          }`}
        >
          Tất cả thể loại
        </button>
        {genres.map((genre) => (
          <button
            key={genre.id || genre.name}
            onClick={() => setSelectedGenre(genre.name)}
            className={`px-4 py-1.5 rounded-full whitespace-nowrap transition cursor-pointer ${
              selectedGenre === genre.name
                ? "bg-primary text-white shadow-md shadow-primary/30 font-medium"
                : "bg-gray-800/80 text-gray-400 hover:text-white border border-white/5"
            }`}
          >
            {genre.name}
          </button>
        ))}
      </div>

      {/* Movie Grid */}
      {loading ? (
        <Loading />
      ) : filteredMovies.length > 0 ? (
        <div className="flex flex-wrap max-sm:justify-center gap-8">
          {filteredMovies.map((movie) => (
            <MovieCard movie={movie} key={movie.id || movie._id} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-xl text-gray-400">Không tìm thấy phim phù hợp.</p>
          <button
            onClick={() => { setSelectedGenre("all"); setSearchTerm(""); }}
            className="mt-4 px-4 py-2 text-sm text-primary hover:underline cursor-pointer"
          >
            Đặt lại bộ lọc
          </button>
        </div>
      )}
    </div>
  );
}
