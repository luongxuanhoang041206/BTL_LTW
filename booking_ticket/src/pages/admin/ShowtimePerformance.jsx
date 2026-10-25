import { useEffect, useState } from "react";
import { Clock, Search, Filter, TrendingUp, Film, Building2 } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { Loading } from "../../components/Loading";
import { Title } from "../../components/admin/Title";

export function ShowtimePerformance() {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      const data = await api.get("/api/admin/analytics/showtime-performance");
      setShows(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message || "Không thể tải báo cáo hiệu suất");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, []);

  const filtered = shows.filter((s) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return s.movieTitle?.toLowerCase().includes(term) || s.cinemaName?.toLowerCase().includes(term);
  });

  return (
    <div className="max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Title text1="Báo Cáo" text2="Hiệu Suất Suất Chiếu" />
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Tìm theo phim, rạp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-white pl-9 pr-3.5 py-2 rounded-xl text-sm focus:outline-none focus:border-primary w-64"
          />
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="mt-6 bg-gray-900/80 rounded-xl border border-primary/20 shadow-xl overflow-hidden">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-black/60 text-xs text-gray-400 uppercase border-b border-gray-800">
              <tr>
                <th className="p-4 pl-6">Phim</th>
                <th className="p-4">Rạp & Phòng</th>
                <th className="p-4">Giờ Chiếu</th>
                <th className="p-4 text-center">Ghế Đã Bán</th>
                <th className="p-4">Tỷ Lệ Lấp Đầy</th>
                <th className="p-4 text-right pr-6">Doanh Thu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.length > 0 ? (
                filtered.map((s) => {
                  const rate = s.occupancyRate || 0;
                  return (
                    <tr key={s.showtimeId} className="hover:bg-white/5 transition">
                      <td className="p-4 pl-6 font-bold text-white max-w-xs truncate">
                        {s.movieTitle}
                      </td>
                      <td className="p-4 text-xs text-gray-300">
                        <p className="font-semibold text-white">{s.cinemaName}</p>
                        <p className="text-gray-500">{s.roomName}</p>
                      </td>
                      <td className="p-4 font-mono text-xs">
                        <span className="text-primary font-bold text-sm">{s.startTime}</span>
                        <p className="text-gray-500">{s.showDate}</p>
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-white">
                        <span className="text-primary">{s.bookedSeats}</span> / {s.totalSeats}
                      </td>
                      <td className="p-4 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${rate}%` }}
                              className={`h-full rounded-full transition-all duration-500 ${
                                rate >= 70
                                  ? "bg-emerald-400"
                                  : rate >= 40
                                  ? "bg-amber-400"
                                  : "bg-primary"
                              }`}
                            ></div>
                          </div>
                          <span className="text-xs font-mono font-bold text-white w-10 text-right">
                            {rate}%
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right pr-6 font-bold text-white font-mono text-base">
                        {Number(s.revenue).toLocaleString("vi-VN")} ₫
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400">
                    Chưa có dữ liệu hiệu suất suất chiếu nào.
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
