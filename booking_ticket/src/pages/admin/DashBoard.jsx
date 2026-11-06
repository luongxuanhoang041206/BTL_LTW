import {
  ChartLineIcon,
  CircleDollarSignIcon,
  PlayCircleIcon,
  UsersIcon,
  RotateCcw,
} from "lucide-react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Loading } from "../../components/Loading";
import { Title } from "../../components/admin/Title";
import { api } from "../../lib/api";

export function DashBoard() {
  const [dashboardData, setDashboardData] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    activeShowsCount: 0,
    totalUsers: 0,
    recentShows: [],
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    api.get("/api/admin/dashboard")
      .then((data) => {
        if (!data) {
          throw new Error("Không có dữ liệu tổng quan để hiển thị.");
        }
        if (active) {
          setDashboardData(data);
          setLoadError("");
        }
      })
      .catch((error) => {
        if (active) {
          setDashboardData({
            totalBookings: 0,
            totalRevenue: 0,
            activeShowsCount: 0,
            totalUsers: 0,
            recentShows: [],
          });
          setLoadError(error.message || "Không thể tải dữ liệu tổng quan.");
          toast.error(error.message || "Không thể tải dữ liệu tổng quan.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [retryCount]);

  const retryDashboardData = () => {
    setLoadError("");
    setLoading(true);
    setRetryCount((count) => count + 1);
  };

  const dashboardCards = [
    {
      title: "Tổng lượt đặt vé",
      value: dashboardData.totalBookings || "0",
      icon: ChartLineIcon,
      color: "text-blue-400",
    },
    {
      title: "Tổng doanh thu",
      value: Number(dashboardData.totalRevenue || 0).toLocaleString("vi-VN") + " ₫",
      icon: CircleDollarSignIcon,
      color: "text-green-400",
    },
    {
      title: "Suất chiếu đang mở",
      value: dashboardData.activeShowsCount || "0",
      icon: PlayCircleIcon,
      color: "text-primary",
    },
    {
      title: "Tổng thành viên",
      value: dashboardData.totalUsers || "0",
      icon: UsersIcon,
      color: "text-purple-400",
    },
  ];

  if (loading) return <Loading />;

  if (loadError) {
    return (
      <div className="max-w-6xl">
        <Title text1="Admin" text2="Dashboard" />
        <div className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-5" role="alert">
          <p className="font-medium text-rose-200">{loadError}</p>
          <button
            type="button"
            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-700 px-3 text-sm text-slate-200 transition hover:bg-slate-800"
            onClick={retryDashboardData}
          >
            <RotateCcw size={16} aria-hidden="true" />
            Thử tải lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Title text1="Admin" text2="Dashboard" />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardCards.map((card, index) => (
          <div
            key={index}
            className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/80 p-5 transition-colors hover:border-slate-600"
          >
            <div>
              <p className="text-xs font-medium text-slate-400">{card.title}</p>
              <p className="mt-1.5 text-2xl font-bold text-white">{card.value}</p>
            </div>
            <div className={`rounded-xl border border-white/10 bg-white/5 p-3 ${card.color}`}>
              <card.icon className="h-6 w-6" />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-12 text-lg font-bold text-white">Suất Chiếu Mới Nhất</p>
      <div className="mt-4 max-w-5xl bg-gray-900/80 border border-primary/20 rounded-xl overflow-hidden shadow-xl">
        {dashboardData.recentShows && dashboardData.recentShows.length > 0 ? (
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-black/50 text-xs text-gray-400 uppercase border-b border-gray-800">
              <tr>
                <th className="px-5 py-3">Tên Phim</th>
                <th className="px-5 py-3">Ngày Chiếu</th>
                <th className="px-5 py-3">Giờ Bắt Đầu</th>
                <th className="px-5 py-3 text-right">Giá Vé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {dashboardData.recentShows.map((show) => (
                <tr key={show.showtimeId} className="hover:bg-white/5 transition">
                  <td className="px-5 py-3.5 font-medium text-white">{show.movieTitle}</td>
                  <td className="px-5 py-3.5">{show.showDate}</td>
                  <td className="px-5 py-3.5 text-primary font-mono">{show.startTime}</td>
                  <td className="px-5 py-3.5 text-right font-bold text-white">
                    {Number(show.price).toLocaleString("vi-VN")} ₫
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-6 text-center text-sm text-gray-400">Chưa có dữ liệu suất chiếu.</p>
        )}
      </div>
    </>
  );
}
