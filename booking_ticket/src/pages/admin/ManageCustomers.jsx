import { useEffect, useState } from "react";
import { Users, Search, Lock, Unlock, Eye, Calendar, Ticket, X } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { Loading } from "../../components/Loading";
import { Title } from "../../components/admin/Title";

export function ManageCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [historyModal, setHistoryModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchCustomers = async (search = searchTerm) => {
    try {
      setLoading(true);
      const query = search ? `/api/admin/customers?search=${encodeURIComponent(search)}` : "/api/admin/customers";
      const data = await api.get(query);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message || "Không thể tải danh sách khách hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCustomers(searchTerm);
  };

  const handleToggleStatus = async (customer) => {
    const action = customer.status ? "khóa" : "mở khóa";
    if (!window.confirm(`Bạn có chắc chắn muốn ${action} tài khoản của ${customer.fullName}?`)) return;

    try {
      const res = await api.request(`/api/admin/customers/${customer.id}/toggle-status`, { method: "PATCH" });
      toast.success(res?.message || "Cập nhật trạng thái thành công!");
      fetchCustomers();
    } catch (err) {
      toast.error(err.message || "Không thể thay đổi trạng thái khách hàng.");
    }
  };

  const openHistory = async (customer) => {
    setSelectedCustomer(customer);
    setHistoryModal(true);
    setHistoryLoading(true);
    try {
      const data = await api.get(`/api/admin/customers/${customer.id}/bookings`);
      setHistoryList(Array.isArray(data) ? data : []);
    } catch {
      setHistoryList([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  return !loading ? (
    <div className="max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Title text1="Quản Lý" text2="Khách Hàng" />
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Tìm theo tên, email, SĐT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-white pl-9 pr-3.5 py-2 rounded-xl text-sm focus:outline-none focus:border-primary w-72"
          />
        </form>
      </div>

      <div className="mt-6 bg-gray-900/80 rounded-xl border border-primary/20 shadow-xl overflow-hidden">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-black/60 text-xs text-gray-400 uppercase border-b border-gray-800">
            <tr>
              <th className="p-4 pl-6">Khách Hàng</th>
              <th className="p-4">Số Điện Thoại</th>
              <th className="p-4">Ngày Đăng Ký</th>
              <th className="p-4 text-center">Đơn Đặt</th>
              <th className="p-4 text-right">Tổng Chi Tiêu</th>
              <th className="p-4 text-center">Trạng Thái</th>
              <th className="p-4 text-right pr-6">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {customers.length > 0 ? (
              customers.map((c) => (
                <tr key={c.id} className="hover:bg-white/5 transition">
                  <td className="p-4 pl-6 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/40 text-primary font-bold flex items-center justify-center shrink-0">
                      {c.fullName ? c.fullName[0].toUpperCase() : "U"}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{c.fullName}</p>
                      <p className="text-xs text-gray-500 font-mono">{c.email}</p>
                    </div>
                  </td>
                  <td className="p-4 text-gray-300 font-mono text-xs">{c.phone}</td>
                  <td className="p-4 text-gray-400 text-xs font-mono">{c.createdAt}</td>
                  <td className="p-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-950/60 text-blue-300 border border-blue-800">
                      {c.bookingCount} vé
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold text-white font-mono">
                    {Number(c.totalSpent).toLocaleString("vi-VN")} ₫
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        c.status
                          ? "bg-green-950/60 text-green-300 border-green-800"
                          : "bg-red-950/60 text-red-300 border-red-800"
                      }`}
                    >
                      {c.status ? "Hoạt động" : "Bị khóa"}
                    </span>
                  </td>
                  <td className="p-4 text-right pr-6 space-x-2">
                    <button
                      onClick={() => openHistory(c)}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                      title="Xem lịch sử đặt vé"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(c)}
                      className={`p-1.5 rounded-lg transition ${
                        c.status
                          ? "text-gray-400 hover:text-red-400 hover:bg-red-950/40"
                          : "text-red-400 hover:text-green-400 hover:bg-green-950/40"
                      }`}
                      title={c.status ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                    >
                      {c.status ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="p-8 text-center text-gray-400">
                  Không tìm thấy khách hàng nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {historyModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111927] border border-gray-700 w-full max-w-2xl rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-primary" /> Lịch Sử Đặt Vé: {selectedCustomer.fullName}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{selectedCustomer.email}</p>
              </div>
              <button onClick={() => setHistoryModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 max-h-96 overflow-y-auto space-y-3">
              {historyLoading ? (
                <div className="py-12 text-center text-gray-400">Đang tải lịch sử...</div>
              ) : historyList.length > 0 ? (
                historyList.map((b) => (
                  <div
                    key={b.bookingId}
                    className="p-3.5 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-white text-sm">{b.movieTitle}</p>
                      <p className="text-gray-400 mt-0.5">
                        Suất: <span className="text-primary font-mono">{b.startTime} ({b.showDate})</span> • Ghế:{" "}
                        <span className="text-white font-mono font-semibold">{b.seats?.join(", ") || "---"}</span>
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Đặt lúc: {b.bookingDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white font-mono text-sm">
                        {Number(b.totalAmount).toLocaleString("vi-VN")} ₫
                      </p>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                          b.status === "Confirmed"
                            ? "bg-green-950 text-green-300 border border-green-800"
                            : "bg-yellow-950 text-yellow-300 border border-yellow-800"
                        }`}
                      >
                        {b.status === "Confirmed" ? "Đã thanh toán" : b.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">Khách hàng chưa có đơn đặt vé nào.</p>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-gray-800 flex justify-end">
              <button
                onClick={() => setHistoryModal(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-medium transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  ) : (
    <Loading />
  );
}
