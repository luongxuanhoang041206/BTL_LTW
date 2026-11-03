import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Building2, MapPin, Phone, Film, X } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { Loading } from "../../components/Loading";
import { Title } from "../../components/admin/Title";

export function ManageCinemas() {
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCinema, setEditingCinema] = useState(null);
  const [form, setForm] = useState({ name: "", address: "", city: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchCinemas = async () => {
    try {
      setLoading(true);
      const data = await api.get("/api/admin/cinemas");
      setCinemas(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message || "Không thể tải danh sách rạp");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCinemas();
  }, []);

  const openAdd = () => {
    setEditingCinema(null);
    setForm({ name: "", address: "", city: "", phone: "" });
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setEditingCinema(c);
    setForm({
      name: c.name || "",
      address: c.address || "",
      city: c.city || "",
      phone: c.phone || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      return toast.error("Vui lòng nhập tên rạp.");
    }
    setSubmitting(true);
    try {
      if (editingCinema) {
        await api.put(`/api/admin/cinemas/${editingCinema.id}`, form);
        toast.success("Cập nhật thông tin rạp thành công!");
      } else {
        await api.post("/api/admin/cinemas", form);
        toast.success("Thêm rạp chiếu mới thành công!");
      }
      setModalOpen(false);
      fetchCinemas();
    } catch (err) {
      toast.error(err.message || "Có lỗi xảy ra.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (c) => {
    if (c.roomCount > 0) {
      return toast.error(`Không thể xóa rạp "${c.name}" vì đang có ${c.roomCount} phòng chiếu.`);
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa rạp "${c.name}"?`)) return;

    try {
      await api.delete(`/api/admin/cinemas/${c.id}`);
      toast.success("Đã xóa rạp chiếu phim.");
      fetchCinemas();
    } catch (err) {
      toast.error(err.message || "Không thể xóa rạp.");
    }
  };

  return !loading ? (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between">
        <Title text1="Quản Lý" text2="Hệ Thống Rạp" />
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl text-sm transition"
        >
          <Plus className="w-4 h-4" /> Thêm Rạp Mới
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cinemas.map((c) => (
          <div
            key={c.id}
            className="bg-gray-900/80 rounded-2xl border border-primary/20 p-5 shadow-xl hover:border-primary/40 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base leading-tight">{c.name}</h3>
                    <p className="text-xs text-primary font-medium mt-0.5">{c.city || "Việt Nam"}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(c)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"
                    title="Chỉnh sửa"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(c)}
                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg"
                    title="Xóa rạp"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs text-gray-300">
                <div className="flex items-center gap-2 text-gray-400">
                  <MapPin className="w-4 h-4 shrink-0 text-gray-500" />
                  <span className="truncate">{c.address || "Chưa cập nhật địa chỉ"}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Phone className="w-4 h-4 shrink-0 text-gray-500" />
                  <span>{c.phone || "Chưa có hotline"}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-800 flex items-center justify-between text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-blue-950/60 text-blue-300 border border-blue-900/50">
                {c.roomCount} phòng chiếu
              </span>
              <span className="text-gray-400 flex items-center gap-1">
                <Film className="w-3.5 h-3.5 text-primary" /> {c.activeShowsCount} suất đang mở
              </span>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111927] border border-gray-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white">
                {editingCinema ? "Cập Nhật Thông Tin Rạp" : "Thêm Rạp Chiếu Mới"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-gray-300 uppercase">Tên rạp</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ví dụ: RoPhim Vincom Bà Triệu"
                  className="mt-1 w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300 uppercase">Thành phố</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Hà Nội, TP.HCM..."
                    className="mt-1 w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-300 uppercase">Số điện thoại</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="024 3974..."
                    className="mt-1 w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-300 uppercase">Địa chỉ chi tiết</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                  placeholder="Tầng 5, TTTM Vincom Center, 191 Bà Triệu..."
                  className="mt-1 w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
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
                  {submitting ? "Đang lưu..." : editingCinema ? "Cập nhật" : "Tạo rạp"}
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
