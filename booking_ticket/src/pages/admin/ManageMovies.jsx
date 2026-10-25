import { useEffect, useState } from "react";
import { PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { Loading } from "../../components/Loading";
import { Title } from "../../components/admin/Title";

const emptyMovie = {
  title: "", description: "", duration: "", releaseDate: "", endDate: "",
  posterUrl: "", trailerUrl: "", director: "", actors: "", language: "",
  ageRating: "", status: "Coming Soon", genreIds: [],
};

const fieldClass = "mt-1 w-full rounded-lg border border-gray-700 bg-black/50 px-3 py-2 text-white";

export function ManageMovies() {
  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingMovieId, setEditingMovieId] = useState(null);
  const [isCreatingMovie, setIsCreatingMovie] = useState(false);
  const [form, setForm] = useState(emptyMovie);
  const [saving, setSaving] = useState(false);

  const loadMovies = async (pageToLoad = page) => {
    setLoading(true);
    try {
      const data = await api.get(`/api/admin/movies?page=${pageToLoad}`);
      setMovies(Array.isArray(data) ? data : []);
      setHasMore(Array.isArray(data) && data.length === 10);
    } catch (err) {
      toast.error(err.message || "Không tải được danh sách phim.");
      setMovies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovies(1);
    api.get("/api/movies/genres").then(setGenres).catch(() => setGenres([]));
  }, []);

  const beginEdit = async (id) => {
    try {
      const movie = await api.get(`/api/admin/movies/${id}`);
      setForm({
        title: movie.title || "", description: movie.description || "", duration: movie.duration || "",
        releaseDate: movie.releaseDate || "", endDate: movie.endDate || "", posterUrl: movie.posterUrl || "",
        trailerUrl: movie.trailerUrl || "", director: movie.director || "", actors: movie.actors || "",
        language: movie.language || "", ageRating: movie.ageRating || "", status: movie.status || "Coming Soon",
        genreIds: (movie.genres || []).map((genre) => genre.id),
      });
      setIsCreatingMovie(false);
      setEditingMovieId(id);
    } catch (err) {
      toast.error(err.message || "Không tải được thông tin phim.");
    }
  };

  const beginCreate = () => {
    setForm(emptyMovie);
    setEditingMovieId(null);
    setIsCreatingMovie(true);
  };

  const closeForm = () => {
    setEditingMovieId(null);
    setIsCreatingMovie(false);
    setForm(emptyMovie);
  };

  const saveMovie = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || Number(form.duration) < 1 || Number(form.duration) > 500) {
      return toast.error("Vui lòng nhập tên phim và thời lượng hợp lệ.");
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        duration: Number(form.duration),
        releaseDate: form.releaseDate || null,
        endDate: form.endDate || null,
      };

      if (isCreatingMovie) {
        await api.post("/api/admin/movies", payload);
        toast.success("Đã tạo phim mới.");
        setPage(1);
        await loadMovies(1);
      } else {
        await api.put(`/api/admin/movies/${editingMovieId}`, payload);
        toast.success("Đã cập nhật phim.");
        await loadMovies();
      }
      closeForm();
    } catch (err) {
      toast.error(err.message || (isCreatingMovie ? "Không thể tạo phim." : "Không thể cập nhật phim."));
    } finally {
      setSaving(false);
    }
  };

  const deleteMovie = async (movie) => {
    if (!window.confirm(`Bạn có chắc muốn xóa phim “${movie.title}” không?`)) return;
    try {
      await api.delete(`/api/admin/movies/${movie.id}`);
      toast.success("Đã xóa phim.");
      await loadMovies();
    } catch (err) {
      toast.error(err.message || "Không thể xóa phim.");
    }
  };

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  if (loading && movies.length === 0) return <Loading />;

  return (
    <>
      <div className="flex items-center justify-between">
        <Title text1="Quản Lý" text2="Phim" />
        <button
          onClick={beginCreate}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
        >
          <PlusIcon className="h-4 w-4" /> Tạo phim mới
        </button>
      </div>

      {(editingMovieId !== null || isCreatingMovie) && (
        <form onSubmit={saveMovie} className="my-6 grid max-w-4xl grid-cols-1 gap-4 rounded-xl border border-gray-800 bg-gray-900/80 p-5 md:grid-cols-2">
          <div className="md:col-span-2 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">{isCreatingMovie ? "Tạo phim mới" : "Sửa thông tin phim"}</h2>
            <button type="button" onClick={closeForm} aria-label="Đóng form" className="text-gray-400 hover:text-white"><XIcon /></button>
          </div>
          <label className="text-sm text-gray-300">Tên phim *<input required maxLength={200} value={form.title} onChange={(e) => setField("title", e.target.value)} className={fieldClass} /></label>
          <label className="text-sm text-gray-300">Thời lượng (phút) *<input required type="number" min="1" max="500" value={form.duration} onChange={(e) => setField("duration", e.target.value)} className={fieldClass} /></label>
          <label className="text-sm text-gray-300 md:col-span-2">Mô tả<textarea rows={3} value={form.description} onChange={(e) => setField("description", e.target.value)} className={fieldClass} /></label>
          <label className="text-sm text-gray-300">URL ảnh poster<input type="url" value={form.posterUrl} onChange={(e) => setField("posterUrl", e.target.value)} className={fieldClass} /></label>
          <label className="text-sm text-gray-300">URL trailer<input type="url" value={form.trailerUrl} onChange={(e) => setField("trailerUrl", e.target.value)} className={fieldClass} /></label>
          <label className="text-sm text-gray-300">Đạo diễn<input value={form.director} onChange={(e) => setField("director", e.target.value)} className={fieldClass} /></label>
          <label className="text-sm text-gray-300">Diễn viên<input value={form.actors} onChange={(e) => setField("actors", e.target.value)} className={fieldClass} /></label>
          <label className="text-sm text-gray-300">Ngôn ngữ<input value={form.language} onChange={(e) => setField("language", e.target.value)} className={fieldClass} /></label>
          <label className="text-sm text-gray-300">Phân loại độ tuổi<input value={form.ageRating} onChange={(e) => setField("ageRating", e.target.value)} className={fieldClass} /></label>
          <label className="text-sm text-gray-300">Ngày khởi chiếu<input type="date" value={form.releaseDate} onChange={(e) => setField("releaseDate", e.target.value)} className={fieldClass} /></label>
          <label className="text-sm text-gray-300">Ngày kết thúc<input type="date" value={form.endDate} onChange={(e) => setField("endDate", e.target.value)} className={fieldClass} /></label>
          <label className="text-sm text-gray-300">Trạng thái<select value={form.status} onChange={(e) => setField("status", e.target.value)} className={fieldClass}><option value="Coming Soon">Sắp chiếu</option><option value="Showing">Đang chiếu</option></select></label>
          <fieldset className="md:col-span-2"><legend className="mb-2 text-sm text-gray-300">Thể loại</legend><div className="flex flex-wrap gap-3">{genres.map((genre) => <label key={genre.id} className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={form.genreIds.includes(genre.id)} onChange={(e) => setField("genreIds", e.target.checked ? [...form.genreIds, genre.id] : form.genreIds.filter((id) => id !== genre.id))} />{genre.name}</label>)}</div></fieldset>
          <div className="md:col-span-2 flex gap-3"><button disabled={saving} className="rounded-lg bg-primary px-5 py-2 font-semibold text-white disabled:opacity-50">{saving ? "Đang lưu..." : isCreatingMovie ? "Tạo phim" : "Lưu thay đổi"}</button><button type="button" onClick={closeForm} className="rounded-lg border border-gray-700 px-5 py-2 text-gray-300">Hủy</button></div>
        </form>
      )}

      {loading ? <Loading /> : movies.length === 0 ? (
        <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">Chưa có phim trong danh sách.</div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {movies.map((movie) => (
            <article key={movie.id} className="flex gap-4 rounded-xl border border-gray-800 bg-gray-900/80 p-4">
              <img src={movie.posterUrl || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300"} alt={movie.title} className="h-36 w-24 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-bold text-white">{movie.title}</h3>
                <p className="mt-1 text-sm text-gray-400">{movie.duration} phút · {movie.isExpired ? "Đã kết thúc" : movie.status === "Showing" ? "Đang chiếu" : "Sắp chiếu"}</p>
                <p className="mt-2 line-clamp-3 text-xs text-gray-500">{movie.description || "Chưa có mô tả."}</p>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => beginEdit(movie.id)} className="inline-flex items-center gap-1 rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-200 hover:border-primary"><PencilIcon className="h-4 w-4" />Sửa</button>
                  <button onClick={() => deleteMovie(movie)} className="inline-flex items-center gap-1 rounded-lg border border-red-900 px-3 py-1.5 text-sm text-red-300 hover:bg-red-950"><Trash2Icon className="h-4 w-4" />Xóa</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button disabled={page <= 1 || loading} onClick={() => { const nextPage = page - 1; setPage(nextPage); loadMovies(nextPage); }} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 disabled:opacity-40">Trang trước</button>
        <span className="text-sm text-gray-400">Trang {page}</span>
        <button disabled={!hasMore || loading} onClick={() => { const nextPage = page + 1; setPage(nextPage); loadMovies(nextPage); }} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 disabled:opacity-40">Trang sau</button>
      </div>
    </>
  );
}
