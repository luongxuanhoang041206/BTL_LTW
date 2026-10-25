import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Grid, Sparkles, AlertCircle, RefreshCw, CheckCircle2, X } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { Loading } from "../../components/Loading";
import { Title } from "../../components/admin/Title";

export function SeatLayoutManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(searchParams.get("roomId") || "");
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [batchModal, setBatchModal] = useState(false);
  const [batchForm, setBatchForm] = useState({ rows: 5, cols: 12, vipRows: "D,E" });
  const [actionLoading, setActionLoading] = useState(false);

  // Lấy danh sách phòng
  useEffect(() => {
    api.get("/api/admin/rooms").then((data) => {
      const roomList = Array.isArray(data) ? data : [];
      setRooms(roomList);
      if (!selectedRoomId && roomList.length > 0) {
        setSelectedRoomId(String(roomList[0].id));
      }
    }).catch(() => setRooms([]));
  }, []);

  // Lấy sơ đồ ghế của phòng đang chọn
  const fetchRoomSeats = async (roomId) => {
    if (!roomId) return;
    try {
      setLoading(true);
      const data = await api.get(`/api/admin/rooms/${roomId}/seats`);
      setRoomData(data);
    } catch (err) {
      toast.error(err.message || "Không thể tải sơ đồ ghế.");
      setRoomData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRoomId) {
      setSearchParams({ roomId: selectedRoomId });
      fetchRoomSeats(selectedRoomId);
      setSelectedSeat(null);
    }
  }, [selectedRoomId]);

  // Nhóm ghế theo hàng
  const seatsByRow = (roomData?.seats || []).reduce((acc, seat) => {
    if (!acc[seat.row]) acc[seat.row] = [];
    acc[seat.row].push(seat);
    return acc;
  }, {});

  const handleToggleSeat = async (seat) => {
    try {
      const res = await api.request(`/api/admin/seats/${seat.id}/toggle`, { method: "PATCH" });
      toast.success(res.isActive ? `Đã kích hoạt ghế ${seat.row}${seat.number}` : `Đã tạm khóa ghế ${seat.row}${seat.number}`);
      fetchRoomSeats(selectedRoomId);
    } catch (err) {
      toast.error(err.message || "Không thể thay đổi trạng thái ghế.");
    }
  };

  const handleChangeType = async (seat, newType) => {
    try {
      await api.request(`/api/admin/seats/${seat.id}/type`, {
        method: "PATCH",
        body: JSON.stringify({ seatType: newType }),
      });
      toast.success(`Đã đổi loại ghế ${seat.row}${seat.number} thành ${newType}`);
      fetchRoomSeats(selectedRoomId);
      setSelectedSeat((prev) => (prev ? { ...prev, type: newType } : null));
    } catch (err) {
      toast.error(err.message || "Không thể đổi loại ghế.");
    }
  };

  const handleBatchGenerate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const vipArray = batchForm.vipRows.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
      await api.post(`/api/admin/rooms/${selectedRoomId}/seats/batch-generate`, {
        rows: Number(batchForm.rows),
        cols: Number(batchForm.cols),
        vipRows: vipArray,
      });
      toast.success("Khởi tạo sơ đồ ghế hàng loạt thành công!");
      setBatchModal(false);
      fetchRoomSeats(selectedRoomId);
    } catch (err) {
      toast.error(err.message || "Không thể tạo sơ đồ ghế.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-6xl pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Title text1="Quản Lý" text2="Sơ Đồ Ghế" />
        <div className="flex items-center gap-3">
          <select
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-white text-sm px-3.5 py-2 rounded-xl focus:outline-none focus:border-primary"
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.cinemaName} - {r.roomName} ({r.roomType})
              </option>
            ))}
          </select>
          <button
            onClick={() => setBatchModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition"
          >
            <RefreshCw className="w-4 h-4" /> Khởi tạo lại sơ đồ
          </button>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : roomData ? (
        <div className="mt-8 space-y-6">
          {/* Thông tin phòng & Chú thích */}
          <div className="bg-gray-900/80 rounded-2xl border border-primary/20 p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Grid className="w-5 h-5 text-primary" />
                {roomData.cinemaName} - {roomData.roomName}
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Định dạng: <span className="text-primary font-bold">{roomData.roomType}</span> • Tổng số ghế:{" "}
                <span className="text-white font-bold">{roomData.seats?.length || 0}</span>
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-slate-700 border border-slate-600"></span>
                <span className="text-gray-300">Ghế Thường</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-purple-600/80 border border-purple-400"></span>
                <span className="text-gray-300">Ghế VIP</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-red-950/80 border border-red-700 opacity-50"></span>
                <span className="text-gray-400">Tạm khóa / Hỏng</span>
              </div>
            </div>
          </div>

          {/* Mô phỏng màn hình và Sơ đồ ghế */}
          <div className="bg-[#0b101b] rounded-2xl border border-gray-800 p-8 shadow-2xl flex flex-col items-center">
            {/* Màn hình cong */}
            <div className="w-full max-w-2xl text-center mb-10">
              <div className="h-2 w-full bg-gradient-to-r from-transparent via-primary to-transparent rounded-full opacity-80 shadow-[0_0_20px_#f84565]"></div>
              <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold mt-2">
                Màn Hình Chiếu
              </p>
            </div>

            {/* Sơ đồ ghế 2D */}
            <div className="w-full overflow-x-auto pb-4 flex flex-col items-center">
              <div className="space-y-2.5 min-w-max">
                {Object.keys(seatsByRow).sort().map((rowName) => (
                  <div key={rowName} className="flex items-center gap-2">
                    <span className="w-6 text-center font-bold text-xs text-gray-400 font-mono">
                      {rowName}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {seatsByRow[rowName]
                        .sort((a, b) => a.number - b.number)
                        .map((seat) => {
                          const isVip = seat.type === "VIP";
                          const isSelected = selectedSeat?.id === seat.id;
                          return (
                            <button
                              key={seat.id}
                              onClick={() => setSelectedSeat(seat)}
                              className={`w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center font-mono ${
                                !seat.isActive
                                  ? "bg-red-950/60 border border-red-800/80 text-red-400 line-through opacity-60"
                                  : isVip
                                  ? "bg-purple-900/60 border border-purple-500/80 text-purple-200 hover:bg-purple-700"
                                  : "bg-slate-800 border border-slate-700 text-gray-200 hover:bg-slate-700"
                              } ${isSelected ? "ring-2 ring-primary scale-110 shadow-lg shadow-primary/30 z-10" : ""}`}
                              title={`Ghế ${seat.row}${seat.number} (${seat.type}) - ${seat.isActive ? "Hoạt động" : "Tạm khóa"}`}
                            >
                              {seat.number}
                            </button>
                          );
                        })}
                    </div>
                    <span className="w-6 text-center font-bold text-xs text-gray-400 font-mono">
                      {rowName}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chi tiết ghế được chọn */}
            {selectedSeat && (
              <div className="mt-8 p-4 rounded-xl bg-gray-900 border border-gray-700 flex flex-wrap items-center justify-between gap-4 w-full max-w-xl">
                <div>
                  <p className="text-sm font-bold text-white flex items-center gap-2">
                    Ghế: <span className="text-primary text-base font-mono">{selectedSeat.row}{selectedSeat.number}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${selectedSeat.type === "VIP" ? "bg-purple-900/80 text-purple-200" : "bg-slate-800 text-gray-300"}`}>
                      {selectedSeat.type}
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${selectedSeat.isActive ? "bg-green-900/80 text-green-200" : "bg-red-900/80 text-red-200"}`}>
                      {selectedSeat.isActive ? "Hoạt động" : "Khóa"}
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Bấm các nút bên phải để cấu hình nhanh vị trí ghế này.</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleChangeType(selectedSeat, selectedSeat.type === "VIP" ? "Normal" : "VIP")}
                    className="px-3 py-1.5 text-xs bg-purple-900/60 hover:bg-purple-800 text-purple-200 rounded-lg border border-purple-700 transition"
                  >
                    Đổi thành {selectedSeat.type === "VIP" ? "Thường" : "VIP"}
                  </button>
                  <button
                    onClick={() => handleToggleSeat(selectedSeat)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition ${
                      selectedSeat.isActive
                        ? "bg-red-950/60 text-red-300 border-red-800 hover:bg-red-900/80"
                        : "bg-green-950/60 text-green-300 border-green-800 hover:bg-green-900/80"
                    }`}
                  >
                    {selectedSeat.isActive ? "Khóa ghế" : "Mở ghế"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-8 p-12 text-center text-gray-400 bg-gray-900/60 rounded-xl">
          Vui lòng chọn một phòng chiếu để xem và quản lý sơ đồ ghế.
        </div>
      )}

      {/* Modal Batch Generate */}
      {batchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111927] border border-gray-700 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> Khởi Tạo Lại Sơ Đồ Ghế
              </h3>
              <button onClick={() => setBatchModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleBatchGenerate} className="mt-4 space-y-4">
              <div className="p-3 rounded-xl bg-yellow-950/40 border border-yellow-800/60 text-xs text-yellow-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Thao tác này sẽ xóa sơ đồ ghế cũ của phòng và sinh lại hàng loạt vị trí mới. Chỉ thực hiện khi phòng chưa có vé đã đặt.</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300 uppercase">Số hàng (A, B, C...)</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={batchForm.rows}
                    onChange={(e) => setBatchForm({ ...batchForm, rows: e.target.value })}
                    className="mt-1 w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-primary text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-300 uppercase">Số ghế mỗi hàng</label>
                  <input
                    type="number"
                    min="4"
                    max="20"
                    value={batchForm.cols}
                    onChange={(e) => setBatchForm({ ...batchForm, cols: e.target.value })}
                    className="mt-1 w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-primary text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-300 uppercase">Các hàng ghế VIP (phân cách bởi dấu phẩy)</label>
                <input
                  type="text"
                  value={batchForm.vipRows}
                  onChange={(e) => setBatchForm({ ...batchForm, vipRows: e.target.value })}
                  placeholder="Ví dụ: D, E, F"
                  className="mt-1 w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-primary text-sm font-mono"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setBatchModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:bg-white/5 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-medium transition disabled:opacity-50"
                >
                  {actionLoading ? "Đang xử lý..." : "Xác nhận tạo mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
