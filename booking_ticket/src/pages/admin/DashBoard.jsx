import {
  ChartLineIcon,
  CircleDollarSignIcon,
  PlayCircleIcon,
  StarIcon,
  UsersIcon,
  CalendarIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { dummyDashboardData } from "../../assets/assets";
import { Loading } from "../../components/Loading";
import { Title } from "../../components/admin/Title";
import { BlurCicle } from "../../components/BlurCircle";
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

  const fetchDashboardData = async () => {
    try {
      const data = await api.get("/api/admin/dashboard");
      if (data) {
        setDashboardData(data);
      } else {
        setDashboardData({
          totalBookings: dummyDashboardData.totalBookings,
          totalRevenue: dummyDashboardData.totalRevenue,
          activeShowsCount: dummyDashboardData.activeShows.length,
          totalUsers: dummyDashboardData.totalUser,
          recentShows: [],
        });
      }
    } catch {
      setDashboardData({
        totalBookings: dummyDashboardData.totalBookings,
        totalRevenue: dummyDashboardData.totalRevenue,
        activeShowsCount: dummyDashboardData.activeShows.length,
        totalUsers: dummyDashboardData.totalUser,
        recentShows: [],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

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

  return !loading ? (
    <>
      <Title text1="Admin" text2="Dashboard" />

      <div className="relative flex flex-wrap gap-4 mt-6">
        <BlurCicle top="-100px" left="0" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {dashboardCards.map((card, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-5 bg-gray-900/90 border border-primary/20 rounded-xl shadow-lg hover:border-primary/40 transition"
            >
              <div>
                <p className="text-xs text-gray-400 uppercase font-medium">{card.title}</p>
                <p className="text-2xl font-bold text-white mt-1.5">{card.value}</p>
              </div>
              <div className={`p-3 rounded-xl bg-white/5 border border-white/10 ${card.color}`}>
                <card.icon className="w-6 h-6" />
              </div>
            </div>
          ))}
        </div>
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
  ) : (
    <Loading />
  );
}
