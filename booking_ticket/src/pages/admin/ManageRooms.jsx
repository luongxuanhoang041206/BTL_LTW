import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Gauge, Grid, Filter, X } from "lucide-react";
import { Link } from "react-router";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { Loading } from "../../components/Loading";
import { Title } from "../../components/admin/Title";

export function ManageRooms() {
  const [rooms, setRooms] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [selectedCinema, setSelectedCinema] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [form, setForm] = useState({
    cinemaId: "",
    roomName: "",
    roomType: "2D",
    totalSeats: 60,
    autoGenerateSeats: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cinemasData, roomsData] = await Promise.all([
        api.get("/api/admin/cinemas"),
        api.get(selectedCinema ? `/api/admin/rooms?cinemaId=${selectedCinema}` : "/api/admin/rooms"),
      ]);
      setCinemas(Array.isArray(cinemasData) ? cinemasData : []);
      setRooms(Array.isArray(roomsData) ? roomsData : []);
    } catch (err) {
      toast.error(err.message || "Không thể tải dữ liệu phòng chiếu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCinema]);

  const openAdd = () => {
    setEditingRoom(null);
    setForm({
      cinemaId: cinemas[0]?.id || "",
      roomName: "",
      roomType: "2D",
      totalSeats: 60,
      autoGenerateSeats: true,
    });
    setModalOpen(true);
  };

  const openEdit = (r) => {
    setEditingRoom(r);
    setForm({
      cinemaId: r.cinemaId,
      roomName: r.roomName,
      roomType: r.roomType,
      totalSeats: r.totalSeats,
      autoGenerateSeats: false,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.cinemaId || !form.roomName.trim()) {
      return toast.error("Vui lòng nhập đầy đủ thông tin phòng chiếu.");
    }
    setSubmitting(true);
    try {
      if (editingRoom) {
        await api.put(`/api/admin/rooms/${editingRoom.id}`, form);
        toast.success("Cập nhật phòng chiếu thành công!");
      } else {
        await api.post("/api/admin/rooms", {
          ...form,
          cinemaId: Number(form.cinemaId),
          totalSeats: Number(form.totalSeats),
        });
        toast.success("Thêm phòng chiếu thành công!");
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.message || "Có lỗi xảy ra.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (r) => {
    if (r.showtimesCount > 0) {
      return toast.error(`Không thể xóa phòng đang có ${r.showtimesCount} suất chiếu.`);
    }
    if (!window.confirm(`Bạn có chắc muốn xóa phòng chiếu "${r.roomName}"?`)) return;

    try {
      await api.delete(`/api/admin/rooms/${r.id}`);
      toast.success("Đã xóa phòng chiếu.");
      fetchData();
    } catch (err) {
      toast.error(err.message || "Không thể xóa phòng chiếu.");
    }
  };

  return !loading ? (
    <div className="max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Title text1="Quản Lý" text2="Phòng Chiếu" />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 px-3 py-1.5 rounded-xl text-sm">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedCinema}
              onChange={(e) => setSelectedCinema(e.target.value)}
              className="bg-transparent text-white outline-none cursor-pointer"
            >
              <option value="" className="bg-gray-900 text-white">Tất cả rạp</option>
              {cinemas.map((c) => (
                <option key={c.id} value={c.id} className="bg-gray-900 text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl text-sm transition"
          >
            <Plus className="w-4 h-4" /> Thêm Phòng
          </button>
        </div>
      </div>

      <div className="mt-6 bg-gray-900/80 rounded-xl border border-primary/20 shadow-xl overflow-hidden">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-black/60 text-xs text-gray-400 uppercase border-b border-gray-800">
            <tr>
              <th className="p-4 pl-6">Tên Phòng</th>
              <th className="p-4">Rạp Chiếu</th>
              <th className="p-4 text-center">Định Dạng</th>
              <th className="p-4 text-center">Tổng Ghế</th>
              <th className="p-4 text-center">Suất Chiếu</th>
              <th className="p-4 text-right pr-6">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {rooms.length > 0 ? (
              rooms.map((r) => (
                <tr key={r.id} className="hover:bg-white/5 transition">
                  <td className="p-4 pl-6 font-semibold text-white flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Gauge className="w-4 h-4" />
                    </div>
                    {r.roomName}
                  </td>
                  <td className="p-4 text-gray-300 font-medium">{r.cinemaName}</td>
                  <td className="p-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-950/60 text-purple-300 border border-purple-800">
                      {r.roomType}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-white font-mono font-bold">{r.totalSeats}</span>{" "}
                    <span className="text-gray-500 text-xs">({r.activeSeats} hoạt động)</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-blue-950/60 text-blue-300 border border-blue-800">
                      {r.showtimesCount} suất
                    </span>
                  </td>
                  <td className="p-4 text-right pr-6 space-x-1.5">
                    <Link
                      to={`/admin/seat-map?roomId=${r.id}`}
                      className="inline-flex items-center gap-1 p-1.5 px-2.5 text-xs text-primary hover:bg-primary/20 rounded-lg transition border border-primary/30"
                      title="Xem và chỉnh sơ đồ ghế"
                    >
                      <Grid className="w-3.5 h-3.5" /> Sơ đồ ghế
                    </Link>
                    <button
                      onClick={() => openEdit(r)}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                      title="Sửa phòng"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(r)}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition"
                      title="Xóa phòng"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="p-8 text-center text-gray-400">
                  Chưa có phòng chiếu nào cho rạp này.
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
                {editingRoom ? "Sửa Phòng Chiếu" : "Thêm Phòng Chiếu Mới"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-gray-300 uppercase">Thuộc Rạp</label>
                <select
                  value={form.cinemaId}
                  onChange={(e) => setForm({ ...form, cinemaId: e.target.value })}
                  className="mt-1 w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
                  required
                >
                  <option value="" disabled>-- Chọn Rạp --</option>
                  {cinemas.map((c) => (
                    <option key={c.id} value={c.id} className="bg-gray-900 text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 uppercase">Tên phòng chiếu</label>
                <input
                  type="text"
                  value={form.roomName}
                  onChange={(e) => setForm({ ...form, roomName: e.target.value })}
                  placeholder="Ví dụ: Phòng 01, Cinema 2D Hall A..."
                  className="mt-1 w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300 uppercase">Định dạng</label>
                  <select
                    value={form.roomType}
                    onChange={(e) => setForm({ ...form, roomType: e.target.value })}
                    className="mt-1 w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
                  >
                    <option value="2D">2D Digital</option>
                    <option value="3D">3D Special</option>
                    <option value="IMAX">IMAX Laser</option>
                    <option value="VIP">VIP Gold Class</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-300 uppercase">Số ghế chuẩn</label>
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={form.totalSeats}
                    onChange={(e) => setForm({ ...form, totalSeats: e.target.value })}
                    className="mt-1 w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
                    disabled={!!editingRoom}
                  />
                </div>
              </div>

              {!editingRoom && (
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 select-none">
                    <input
                      type="checkbox"
                      checked={form.autoGenerateSeats}
                      onChange={(e) => setForm({ ...form, autoGenerateSeats: e.target.checked })}
                      className="rounded accent-primary w-4 h-4"
                    />
                    Tự động tạo hàng ghế chuẩn A-E (mỗi hàng 12 ghế, có phân loại VIP)
                  </label>
                </div>
              )}

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
                  {submitting ? "Đang lưu..." : editingRoom ? "Cập nhật" : "Tạo phòng"}
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
