import { useEffect, useState } from "react";
import { Zap, Plus, Edit2, Trash2, CheckCircle, XCircle, Tag, Calendar, X } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { Loading } from "../../components/Loading";
import { Title } from "../../components/admin/Title";

export function ManagePromotions() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [form, setForm] = useState({
    code: "",
    description: "",
    discountPercent: 10,
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    status: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const data = await api.get("/api/admin/promotions");
      setPromotions(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message || "Không thể tải danh sách khuyến mãi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const openAdd = () => {
    setEditingPromo(null);
    setForm({
      code: "",
      description: "",
      discountPercent: 10,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: true,
    });
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditingPromo(p);
    setForm({
      code: p.code,
      description: p.description || "",
      discountPercent: p.discountPercent,
      startDate: p.startDate,
      endDate: p.endDate,
      status: p.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code.trim()) {
      return toast.error("Vui lòng nhập mã khuyến mãi.");
    }
    setSubmitting(true);
    try {
      if (editingPromo) {
        await api.put(`/api/admin/promotions/${editingPromo.id}`, form);
        toast.success("Cập nhật khuyến mãi thành công!");
      } else {
        await api.post("/api/admin/promotions", form);
        toast.success("Tạo mã khuyến mãi mới thành công!");
      }
      setModalOpen(false);
      fetchPromotions();
    } catch (err) {
      toast.error(err.message || "Có lỗi xảy ra.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (p) => {
    try {
      await api.request(`/api/admin/promotions/${p.id}/toggle`, { method: "PATCH" });
      toast.success(p.status ? "Đã tạm dừng mã khuyến mãi" : "Đã kích hoạt mã khuyến mãi");
      fetchPromotions();
    } catch (err) {
      toast.error(err.message || "Không thể thay đổi trạng thái.");
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa mã "${p.code}"?`)) return;
    try {
      const res = await api.delete(`/api/admin/promotions/${p.id}`);
      toast.success(res?.message || "Đã xóa mã khuyến mãi.");
      fetchPromotions();
    } catch (err) {
      toast.error(err.message || "Không thể xóa khuyến mãi.");
    }
  };

  return !loading ? (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between">
        <Title text1="Quản Lý" text2="Mã Khuyến Mãi" />
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl text-sm transition"
        >
          <Plus className="w-4 h-4" /> Tạo Mã Khuyến Mãi
        </button>
      </div>

      <div className="mt-6 bg-gray-900/80 rounded-xl border border-primary/20 shadow-xl overflow-hidden">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-black/60 text-xs text-gray-400 uppercase border-b border-gray-800">
            <tr>
              <th className="p-4 pl-6">Mã Code</th>
              <th className="p-4">Mô Tả Khuyến Mãi</th>
              <th className="p-4 text-center">Giảm Giá</th>
              <th className="p-4">Thời Gian Hiệu Lực</th>
              <th className="p-4 text-center">Lượt Dùng</th>
              <th className="p-4 text-center">Trạng Thái</th>
              <th className="p-4 text-right pr-6">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {promotions.length > 0 ? (
              promotions.map((p) => (
                <tr key={p.id} className="hover:bg-white/5 transition">
                  <td className="p-4 pl-6 font-mono font-bold text-primary flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400 shrink-0" />
                    <span className="bg-primary/10 border border-primary/30 px-2.5 py-1 rounded-lg">
                      {p.code}
                    </span>
                  </td>
                  <td className="p-4 text-white font-medium max-w-xs">{p.description}</td>
                  <td className="p-4 text-center font-bold text-emerald-400 font-mono text-base">
                    -{p.discountPercent}%
                  </td>
                  <td className="p-4 text-xs text-gray-400 font-mono">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                      <span>{p.startDate} ~ {p.endDate}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center font-mono font-bold text-white">
                    {p.usedCount}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleToggle(p)}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition ${
                        p.status
                          ? "bg-green-950/60 text-green-300 border-green-800 hover:bg-green-900"
                          : "bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700"
                      }`}
                    >
                      {p.status ? "Đang áp dụng" : "Tạm ngưng"}
                    </button>
                  </td>
                  <td className="p-4 text-right pr-6 space-x-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"
                      title="Sửa khuyến mãi"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg"
                      title="Xóa khuyến mãi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="p-8 text-center text-gray-400">
                  Chưa có mã khuyến mãi nào trong hệ thống.
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
                {editingPromo ? "Cập Nhật Mã Khuyến Mãi" : "Tạo Mã Khuyến Mãi Mới"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-gray-300 uppercase">Mã khuyến mãi (Code)</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="Ví dụ: ROPHIM20, CHAOHAMOI..."
                  className="mt-1 w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2 text-white uppercase font-mono tracking-wider focus:outline-none focus:border-primary text-sm"
                  required
                  disabled={!!editingPromo}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 uppercase">Mô tả chương trình</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Giảm 20% cho thành viên mới..."
                  className="mt-1 w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-primary text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 uppercase">Phần trăm giảm (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={form.discountPercent}
                  onChange={(e) => setForm({ ...form, discountPercent: Number(e.target.value) })}
                  className="mt-1 w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-primary text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300 uppercase">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="mt-1 w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-primary text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-300 uppercase">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="mt-1 w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-primary text-sm"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="promoStatus"
                  checked={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.checked })}
                  className="rounded accent-primary w-4 h-4"
                />
                <label htmlFor="promoStatus" className="text-xs text-gray-300 cursor-pointer">
                  Kích hoạt mã khuyến mãi ngay sau khi lưu
                </label>
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
                  {submitting ? "Đang lưu..." : editingPromo ? "Cập nhật" : "Tạo mã"}
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
