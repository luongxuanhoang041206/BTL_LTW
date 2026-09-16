import { useEffect, useState } from "react";
import { Loading } from "../../components/Loading";
import { Title } from "../../components/admin/Title";
import { api } from "../../lib/api";
import { CheckCircleIcon, ClockIcon, XCircleIcon } from "lucide-react";

export function ListBookings() {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const getAllBookings = async () => {
    try {
      const data = await api.get("/api/admin/bookings");
      if (Array.isArray(data)) {
        setBookings(data);
      } else {
        setBookings([]);
      }
    } catch {
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getAllBookings();
  }, []);

  return !isLoading ? (
    <>
      <Title text1="Quản Lý" text2="Đặt Vé" />
      <div className="max-w-6xl mt-6 overflow-x-auto bg-gray-900/80 rounded-xl border border-primary/20 shadow-xl">
        <table className="w-full border-collapse text-left text-sm text-gray-300">
          <thead>
            <tr className="bg-black/60 text-xs text-gray-400 uppercase border-b border-gray-800">
              <th className="p-3.5 pl-5">Mã Vé</th>
              <th className="p-3.5">Khách Hàng</th>
              <th className="p-3.5">Phim</th>
              <th className="p-3.5">Suất Chiếu</th>
              <th className="p-3.5">Ghế Đặt</th>
              <th className="p-3.5 text-right">Tổng Tiền</th>
              <th className="p-3.5 text-center pr-5">Trạng Thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {bookings.length > 0 ? (
              bookings.map((item) => (
                <tr key={item.bookingId} className="hover:bg-white/5 transition">
                  <td className="p-3.5 pl-5 font-mono text-primary font-bold">
                    {item.bookingCode}
                  </td>
                  <td className="p-3.5">
                    <p className="font-medium text-white">{item.customerName}</p>
                    <p className="text-xs text-gray-500">{item.customerEmail}</p>
                  </td>
                  <td className="p-3.5 font-semibold text-white truncate max-w-40">
                    {item.movieTitle}
                  </td>
                  <td className="p-3.5 text-xs text-gray-400">
                    <p className="text-white font-medium">{item.startTime} - {item.showDate}</p>
                    <p className="text-gray-500 text-[11px]">Đặt: {item.bookingDate}</p>
                  </td>
                  <td className="p-3.5">
                    <span className="text-xs px-2 py-1 rounded bg-black/60 border border-gray-700 text-gray-200">
                      {item.seats && item.seats.length > 0 ? item.seats.join(", ") : `${item.seatCount} ghế`}
                    </span>
                  </td>
                  <td className="p-3.5 text-right font-bold text-white">
                    {Number(item.finalAmount).toLocaleString("vi-VN")} ₫
                  </td>
                  <td className="p-3.5 text-center pr-5">
                    {item.status === "Confirmed" || item.status === "Paid" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-400 bg-green-950/60 px-2.5 py-1 rounded-full border border-green-800">
                        <CheckCircleIcon className="w-3 h-3" /> Đã thanh toán
                      </span>
                    ) : item.status === "Pending" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-yellow-400 bg-yellow-950/60 px-2.5 py-1 rounded-full border border-yellow-800">
                        <ClockIcon className="w-3 h-3" /> Chờ xử lý
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-red-400 bg-red-950/60 px-2.5 py-1 rounded-full border border-red-800">
                        <XCircleIcon className="w-3 h-3" /> Đã hủy
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="p-6 text-center text-gray-400">
                  Chưa có lịch sử đặt vé nào trong hệ thống.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  ) : (
    <Loading />
  );
}
