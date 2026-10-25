import { useEffect, useState } from "react";
import { CircleDollarSign, TrendingUp, Ticket, Building2, Calendar, Film } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { Loading } from "../../components/Loading";
import { Title } from "../../components/admin/Title";

export function RevenueReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRevenue = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/admin/analytics/revenue");
      setData(res);
    } catch (err) {
      toast.error(err.message || "Không thể tải báo cáo doanh thu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
  }, []);

  if (loading) return <Loading />;
  if (!data) return <div className="p-8 text-center text-gray-400">Không có dữ liệu báo cáo.</div>;

  const maxDaily = Math.max(...(data.dailyRevenue?.map((d) => d.revenue) || [1]), 1);

  return (
    <div className="max-w-6xl space-y-8">
      <div className="flex items-center justify-between">
        <Title text1="Báo Cáo" text2="Doanh Thu & Tài Chính" />
        <span className="text-xs text-gray-400 font-mono">Dữ liệu thời gian thực từ cơ sở dữ liệu</span>
      </div>

      {/* Cards thống kê chính */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 bg-gray-900/90 border border-primary/20 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Tổng doanh thu thực tế</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
              {Number(data.totalRevenue || 0).toLocaleString("vi-VN")} ₫
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CircleDollarSign className="w-7 h-7" />
          </div>
        </div>

        <div className="p-5 bg-gray-900/90 border border-primary/20 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Đơn vé đã thanh toán</p>
            <p className="text-2xl font-bold text-white mt-1 font-mono">
              {data.totalConfirmedBookings || 0} đơn
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Ticket className="w-7 h-7" />
          </div>
        </div>

        <div className="p-5 bg-gray-900/90 border border-primary/20 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Giá trị trung bình / đơn</p>
            <p className="text-2xl font-bold text-primary mt-1 font-mono">
              {Number(data.avgTicketValue || 0).toLocaleString("vi-VN")} ₫
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <TrendingUp className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Biểu đồ doanh thu 7 ngày */}
      <div className="bg-gray-900/80 rounded-2xl border border-primary/20 p-6 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-6">
          <Calendar className="w-4 h-4 text-primary" /> Doanh Thu 7 Ngày Gần Nhất
        </h3>
        <div className="grid grid-cols-7 gap-3 items-end h-48 pt-6 pb-2">
          {data.dailyRevenue?.map((item, idx) => {
            const heightPercent = maxDaily > 0 ? Math.max(10, Math.round((item.revenue / maxDaily) * 100)) : 10;
            return (
              <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
                <span className="text-[11px] font-mono font-bold text-primary opacity-0 group-hover:opacity-100 transition truncate max-w-full">
                  {Number(item.revenue).toLocaleString("vi-VN")} ₫
                </span>
                <div
                  style={{ height: `${heightPercent}%` }}
                  className="w-full max-w-[42px] bg-gradient-to-t from-primary/30 to-primary rounded-t-lg transition-all duration-500 group-hover:brightness-125"
                ></div>
                <span className="text-xs text-gray-400 font-mono font-medium">{item.date}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2 Cột: Top Phim & Doanh Thu Theo Rạp */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Phim */}
        <div className="bg-gray-900/80 rounded-2xl border border-primary/20 p-6 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
            <Film className="w-4 h-4 text-primary" /> Top 5 Phim Đạt Doanh Thu Cao Nhất
          </h3>
          <div className="space-y-4">
            {data.topMovies && data.topMovies.length > 0 ? (
              data.topMovies.map((m, idx) => {
                const percent = data.totalRevenue > 0 ? Math.round((m.revenue / data.totalRevenue) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-white truncate max-w-xs">{idx + 1}. {m.movieTitle}</span>
                      <span className="font-mono text-emerald-400 font-bold">{Number(m.revenue).toLocaleString("vi-VN")} ₫</span>
                    </div>
                    <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className="h-full bg-primary rounded-full transition-all duration-500"
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 text-xs py-4 text-center">Chưa có dữ liệu phim.</p>
            )}
          </div>
        </div>

        {/* Doanh thu theo Rạp */}
        <div className="bg-gray-900/80 rounded-2xl border border-primary/20 p-6 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-primary" /> Doanh Thu Theo Cụm Rạp
          </h3>
          <div className="space-y-4">
            {data.cinemaRevenue && data.cinemaRevenue.length > 0 ? (
              data.cinemaRevenue.map((c, idx) => {
                const percent = data.totalRevenue > 0 ? Math.round((c.revenue / data.totalRevenue) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-white">{c.cinemaName}</span>
                      <span className="font-mono text-white font-bold">{Number(c.revenue).toLocaleString("vi-VN")} ₫ ({percent}%)</span>
                    </div>
                    <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 text-xs py-4 text-center">Chưa có doanh thu theo rạp.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
