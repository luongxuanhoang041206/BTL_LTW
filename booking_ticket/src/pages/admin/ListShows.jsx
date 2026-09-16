import { useEffect, useState } from "react";
import { dummyShowsData } from "../../assets/assets";
import { Loading } from "../../components/Loading";
import { Title } from "../../components/admin/Title";
import { api } from "../../lib/api";

export function ListShows() {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAllShows = async () => {
    try {
      const data = await api.get("/api/admin/shows");
      if (Array.isArray(data) && data.length > 0) {
        setShows(data);
      } else {
        setShows([
          {
            movieTitle: dummyShowsData[0]?.title || "Phim Mẫu",
            showDateTime: "2026-09-16T19:00:00",
            cinemaName: "CGV Vincom",
            roomName: "Phòng 1",
            price: 75000,
            totalBookings: 8,
            earnings: 600000,
          },
        ]);
      }
    } catch {
      setShows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAllShows();
  }, []);

  return !loading ? (
    <>
      <Title text1="Danh Sách" text2="Suất Chiếu" />
      <div className="max-w-5xl mt-6 overflow-x-auto bg-gray-900/80 rounded-xl border border-primary/20 shadow-xl">
        <table className="w-full border-collapse text-left text-sm text-gray-300">
          <thead>
            <tr className="bg-black/60 text-xs text-gray-400 uppercase border-b border-gray-800">
              <th className="p-3.5 pl-5">Tên Phim</th>
              <th className="p-3.5">Thời Gian Chiếu</th>
              <th className="p-3.5">Rạp & Phòng</th>
              <th className="p-3.5 text-center">Vé Đã Đặt</th>
              <th className="p-3.5 text-right pr-5">Doanh Thu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {shows.map((show, index) => (
              <tr key={index} className="hover:bg-white/5 transition">
                <td className="p-3.5 pl-5 font-semibold text-white">
                  {show.movieTitle}
                </td>
                <td className="p-3.5 text-primary font-mono">
                  {show.showDateTime ? new Date(show.showDateTime).toLocaleString("vi-VN") : "19:00"}
                </td>
                <td className="p-3.5 text-gray-400">
                  {show.cinemaName || "Rạp 1"} - {show.roomName || "Phòng 1"}
                </td>
                <td className="p-3.5 text-center">
                  <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-bold">
                    {show.totalBookings ?? 0} vé
                  </span>
                </td>
                <td className="p-3.5 text-right pr-5 font-bold text-white">
                  {Number(show.earnings || 0).toLocaleString("vi-VN")} ₫
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  ) : (
    <Loading />
  );
}
