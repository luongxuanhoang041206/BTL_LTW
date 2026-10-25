import { useEffect, useState } from "react";
import { Activity, Building2, Gauge, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { Loading } from "../../components/Loading";
import { Title } from "../../components/admin/Title";

export function SeatOccupancyReport() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOccupancy = async () => {
    try {
      setLoading(true);
      const data = await api.get("/api/admin/analytics/seat-occupancy");
      setRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message || "Không thể tải báo cáo tỷ lệ lấp đầy");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOccupancy();
  }, []);

  return !loading ? (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <Title text1="Báo Cáo" text2="Tỷ Lệ Lấp Đầy Ghế Theo Phòng" />
        <span className="text-xs text-gray-400 font-mono">Thống kê trên toàn bộ suất chiếu</span>
      </div>

      <div className="bg-gray-900/80 rounded-xl border border-primary/20 shadow-xl overflow-hidden">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-black/60 text-xs text-gray-400 uppercase border-b border-gray-800">
            <tr>
              <th className="p-4 pl-6">Rạp Chiếu</th>
              <th className="p-4">Phòng Chiếu</th>
              <th className="p-4 text-center">Định Dạng</th>
              <th className="p-4 text-center">Tổng Suất Chiếu</th>
              <th className="p-4 text-center">Ghế Đã Bán / Cung Cấp</th>
              <th className="p-4 pr-6">Tỷ Lệ Lấp Đầy (%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {rooms.length > 0 ? (
              rooms.map((r, idx) => {
                const rate = r.occupancyRate || 0;
                return (
                  <tr key={idx} className="hover:bg-white/5 transition">
                    <td className="p-4 pl-6 font-semibold text-white flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" /> {r.cinemaName}
                    </td>
                    <td className="p-4 font-medium text-white">{r.roomName}</td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-950/60 text-purple-300 border border-purple-800">
                        {r.roomType}
                      </span>
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-white">
                      {r.totalShowtimes} suất
                    </td>
                    <td className="p-4 text-center font-mono text-xs">
                      <span className="font-bold text-primary">{r.totalSeatsBooked}</span> /{" "}
                      <span className="text-gray-400">{r.totalSeatsOffered}</span>
                    </td>
                    <td className="p-4 pr-6 min-w-[160px]">
                      <div className="flex items-center gap-3">
                        <div className="h-2.5 flex-1 bg-gray-800 rounded-full overflow-hidden">
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
                        <span className="text-xs font-mono font-bold text-white w-12 text-right">
                          {rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" className="p-8 text-center text-gray-400">
                  Chưa có dữ liệu phòng chiếu nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  ) : (
    <Loading />
  );
}
