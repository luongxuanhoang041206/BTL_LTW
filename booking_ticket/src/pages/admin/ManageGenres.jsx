import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Clapperboard, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { Loading } from "../../components/Loading";
import { Title } from "../../components/admin/Title";

export function ManageGenres() {
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGenre, setEditingGenre] = useState(null);
  const [genreName, setGenreName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchGenres = async () => {
    try {
      setLoading(true);
      const data = await api.get("/api/admin/genres");
      setGenres(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message || "Không thể tải danh sách thể loại");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGenres();
  }, []);

  const openAddModal = () => {
    setEditingGenre(null);
    setGenreName("");
    setModalOpen(true);
  };

  const openEditModal = (genre) => {
    setEditingGenre(genre);
    setGenreName(genre.name);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!genreName.trim()) {
      return toast.error("Vui lòng nhập tên thể loại.");
    }
    setSubmitting(true);
    try {
      if (editingGenre) {
        await api.put(`/api/admin/genres/${editingGenre.id}`, { name: genreName.trim() });
        toast.success("Cập nhật thể loại thành công!");
      } else {
        await api.post("/api/admin/genres", { name: genreName.trim() });
        toast.success("Thêm thể loại thành công!");
      }
      setModalOpen(false);
      fetchGenres();
    } catch (err) {
      toast.error(err.message || "Có lỗi xảy ra.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (genre) => {
    if (genre.movieCount > 0) {
      return toast.error(`Không thể xóa thể loại vì đang có ${genre.movieCount} phim liên kết.`);
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa thể loại "${genre.name}"?`)) return;

    try {
      await api.delete(`/api/admin/genres/${genre.id}`);
      toast.success("Đã xóa thể loại.");
      fetchGenres();
    } catch (err) {
      toast.error(err.message || "Không thể xóa thể loại.");
    }
  };

  return !loading ? (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between">
        <Title text1="Quản Lý" text2="Thể Loại Phim" />
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl text-sm transition"
        >
          <Plus className="w-4 h-4" /> Thêm Thể Loại
        </button>
      </div>

      <div className="mt-6 bg-gray-900/80 rounded-xl border border-primary/20 shadow-xl overflow-hidden">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-black/60 text-xs text-gray-400 uppercase border-b border-gray-800">
            <tr>
              <th className="p-4 pl-6">ID</th>
              <th className="p-4">Tên Thể Loại</th>
              <th className="p-4 text-center">Số Lượng Phim</th>
              <th className="p-4 text-right pr-6">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {genres.length > 0 ? (
              genres.map((g) => (
                <tr key={g.id} className="hover:bg-white/5 transition">
                  <td className="p-4 pl-6 text-gray-500 font-mono">#{g.id}</td>
                  <td className="p-4 font-semibold text-white flex items-center gap-2">
                    <Clapperboard className="w-4 h-4 text-primary" /> {g.name}
                  </td>
                  <td className="p-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950/60 text-blue-300 border border-blue-800">
                      {g.movieCount} phim
                    </span>
                  </td>
                  <td className="p-4 text-right pr-6 space-x-2">
                    <button
                      onClick={() => openEditModal(g)}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                      title="Sửa thể loại"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(g)}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition"
                      title="Xóa thể loại"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="p-8 text-center text-gray-400">
                  Chưa có thể loại nào trong hệ thống.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111927] border border-gray-700 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white">
                {editingGenre ? "Sửa Thể Loại" : "Thêm Thể Loại Mới"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 uppercase">
                  Tên thể loại
                </label>
                <input
                  type="text"
                  value={genreName}
                  onChange={(e) => setGenreName(e.target.value)}
                  placeholder="Ví dụ: Hành động, Viễn tưởng..."
                  className="mt-1.5 w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-primary"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:bg-white/5 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-medium transition disabled:opacity-50"
                >
                  {submitting ? "Đang lưu..." : editingGenre ? "Cập nhật" : "Tạo mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  ) : (
    <Loading />
  );
}
