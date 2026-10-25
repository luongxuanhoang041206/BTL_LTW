import { useEffect, useState } from "react";
import { CreditCard, CheckCircle2, Clock, XCircle, Search, Filter, Check } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { Loading } from "../../components/Loading";
import { Title } from "../../components/admin/Title";

export function ManagePayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [verifyingId, setVerifyingId] = useState(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      let query = "/api/admin/payments?";
      if (statusFilter) query += `status=${statusFilter}&`;
      if (methodFilter) query += `method=${methodFilter}&`;
      const data = await api.get(query);
      setPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message || "Không thể tải danh sách thanh toán");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter, methodFilter]);

  const handleVerify = async (payment) => {
    if (!window.confirm(`Xác nhận thanh toán thủ công cho giao dịch #${payment.id} (Mã vé: ${payment.bookingCode})?`)) return;
    setVerifyingId(payment.id);
    try {
      await api.post(`/api/admin/payments/${payment.id}/verify`, {});
      toast.success("Đã xác nhận thanh toán thành công!");
      fetchPayments();
    } catch (err) {
      toast.error(err.message || "Không thể xác nhận thanh toán.");
    } finally {
      setVerifyingId(null);
    }
  };

  const filtered = payments.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.bookingCode?.toLowerCase().includes(term) ||
      p.transactionCode?.toLowerCase().includes(term) ||
      p.customerName?.toLowerCase().includes(term) ||
      p.customerEmail?.toLowerCase().includes(term) ||
      p.movieTitle?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Title text1="Quản Lý" text2="Thanh Toán & Giao Dịch" />
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo mã vé, khách hàng, GD..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-white pl-9 pr-3.5 py-1.5 rounded-xl text-sm focus:outline-none focus:border-primary w-60"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-white text-sm px-3 py-1.5 rounded-xl outline-none"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Completed">Đã thanh toán</option>
            <option value="Pending">Chờ thanh toán</option>
            <option value="Failed">Thất bại / Hủy</option>
          </select>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-white text-sm px-3 py-1.5 rounded-xl outline-none"
          >
            <option value="">Tất cả phương thức</option>
            <option value="VNPAY">VNPAY</option>
            <option value="SePay">Chuyển khoản SePay</option>
            <option value="Cash">Tiền mặt tại quầy</option>
          </select>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="mt-6 bg-gray-900/80 rounded-xl border border-primary/20 shadow-xl overflow-hidden">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-black/60 text-xs text-gray-400 uppercase border-b border-gray-800">
              <tr>
                <th className="p-4 pl-6">Mã Vé</th>
                <th className="p-4">Khách Hàng</th>
                <th className="p-4">Phim</th>
                <th className="p-4">Phương Thức</th>
                <th className="p-4 text-right">Số Tiền</th>
                <th className="p-4 text-center">Trạng Thái</th>
                <th className="p-4 text-right pr-6">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.length > 0 ? (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-white/5 transition">
                    <td className="p-4 pl-6">
                      <p className="font-mono text-primary font-bold">{p.bookingCode}</p>
                      <p className="text-[11px] text-gray-500 font-mono">GD: {p.transactionCode}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-white">{p.customerName}</p>
                      <p className="text-xs text-gray-500">{p.customerEmail}</p>
                    </td>
                    <td className="p-4 font-medium text-white max-w-44 truncate">
                      {p.movieTitle}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-800 border border-gray-700 text-gray-200">
                        {p.method}
                      </span>
                      {p.paidAt && (
                        <p className="text-[11px] text-gray-500 mt-1">{p.paidAt}</p>
                      )}
                    </td>
                    <td className="p-4 text-right font-bold text-white font-mono text-base">
                      {Number(p.amount).toLocaleString("vi-VN")} ₫
                    </td>
                    <td className="p-4 text-center">
                      {p.status === "Completed" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-950/60 text-green-300 border border-green-800">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Thành công
                        </span>
                      ) : p.status === "Pending" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-950/60 text-yellow-300 border border-yellow-800">
                          <Clock className="w-3.5 h-3.5" /> Chờ xử lý
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-950/60 text-red-300 border border-red-800">
                          <XCircle className="w-3.5 h-3.5" /> Thất bại
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right pr-6">
                      {p.status === "Pending" ? (
                        <button
                          onClick={() => handleVerify(p)}
                          disabled={verifyingId === p.id}
                          className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" /> Xác nhận
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500 font-mono">Đã đối soát</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-400">
                    Không tìm thấy dữ liệu giao dịch thanh toán nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
