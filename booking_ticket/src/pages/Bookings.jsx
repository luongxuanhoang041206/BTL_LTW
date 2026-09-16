import { useEffect, useState } from "react";
import { dummyBookingData } from "../assets/assets";
import { Loading } from "../components/Loading";
import { BlurCicle } from "../components/BlurCircle";
import { ClockIcon, MapPinIcon, TicketIcon, CheckCircleIcon, AlertCircleIcon, XCircleIcon } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export function Bookings() {
  const { user, openLogin } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookings = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.get("/api/booking/my-bookings");
      if (Array.isArray(data)) {
        setBookings(data);
      } else {
        setBookings([]);
      }
    } catch {
      // Fallback
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user]);

  const handleCancelBooking = async (bookingId) => {
    if (!confirm("Bạn có chắc chắn muốn hủy vé này không?")) return;
    try {
      const res = await api.post(`/api/booking/cancel/${bookingId}`, {});
      if (res.success) {
        toast.success("Hủy vé thành công!");
        fetchBookings();
      }
    } catch (err) {
      toast.error(err.message || "Không thể hủy vé.");
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] px-4 text-center pt-32">
        <TicketIcon className="w-16 h-16 text-primary mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold text-white mb-2">Vui lòng đăng nhập</h2>
        <p className="text-gray-400 max-w-md mb-6 text-sm">
          Đăng nhập vào tài khoản của bạn để theo dõi danh sách vé xem phim đã đặt và lịch sử thanh toán.
        </p>
        <button
          onClick={openLogin}
          className="px-8 py-3 bg-primary hover:bg-primary-dull text-white font-semibold rounded-full shadow-lg shadow-primary/30 transition cursor-pointer"
        >
          Đăng nhập ngay
        </button>
      </div>
    );
  }

  if (isLoading) return <Loading />;

  return (
    <div className="relative px-6 md:px-16 lg:px-40 pt-32 md:pt-36 min-h-[85vh] pb-24">
      <BlurCicle top="100px" left="100px" />
      <BlurCicle bottom="0" right="200px" />

      <div className="flex items-center justify-between mb-8 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-white">Vé Của Tôi</h1>
          <p className="text-gray-400 text-sm mt-1">Quản lý và xuất trình mã vé tại quầy rạp chiếu</p>
        </div>
        <span className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-full border border-primary/30 font-medium">
          {bookings.length} vé đã đặt
        </span>
      </div>

      {bookings.length > 0 ? (
        <div className="space-y-6 max-w-4xl">
          {bookings.map((item) => {
            const isConfirmed = item.status === "Confirmed" || item.status === "Paid";
            const isPending = item.status === "Pending";
            const isCancelled = item.status === "Cancelled";

            return (
              <div
                key={item.bookingId}
                className="flex flex-col md:flex-row justify-between bg-gray-900/90 border border-primary/20 hover:border-primary/40 rounded-2xl overflow-hidden shadow-xl transition"
              >
                {/* Poster & Showtime Details */}
                <div className="flex flex-col sm:flex-row gap-4 p-4 md:p-5">
                  <img
                    src={item.posterUrl || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800"}
                    alt={item.movieTitle}
                    className="w-full sm:w-32 h-44 object-cover rounded-xl shadow-md border border-white/10"
                    onError={(e) => {
                      e.target.src = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800";
                    }}
                  />
                  <div className="flex flex-col justify-between py-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-primary font-bold">
                          MÃ VÉ: MB-{item.bookingId.toString().padStart(6, "0")}
                        </span>
                        {isConfirmed && (
                          <span className="flex items-center gap-1 text-[11px] text-green-400 bg-green-950/60 px-2 py-0.5 rounded border border-green-800">
                            <CheckCircleIcon className="w-3 h-3" /> Đã thanh toán
                          </span>
                        )}
                        {isPending && (
                          <span className="flex items-center gap-1 text-[11px] text-yellow-400 bg-yellow-950/60 px-2 py-0.5 rounded border border-yellow-800">
                            <AlertCircleIcon className="w-3 h-3" /> Chờ thanh toán
                          </span>
                        )}
                        {isCancelled && (
                          <span className="flex items-center gap-1 text-[11px] text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-800">
                            <XCircleIcon className="w-3 h-3" /> Đã hủy
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-bold text-white mt-1.5">{item.movieTitle}</h3>

                      <div className="flex flex-col gap-1 text-xs text-gray-300 mt-2">
                        <p className="flex items-center gap-1 text-gray-400">
                          <MapPinIcon className="w-3.5 h-3.5 text-primary" />
                          {item.cinemaName}
                        </p>
                        <p className="flex items-center gap-1 text-gray-400">
                          <ClockIcon className="w-3.5 h-3.5 text-primary" />
                          Suất chiếu:{" "}
                          <strong className="text-white">
                            {item.startTime ? item.startTime.substring(0, 5) : "19:00"}
                          </strong>{" "}
                          - Ngày {item.showDate}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-800">
                      Ngày đặt vé: {new Date(item.bookingDate).toLocaleString("vi-VN")}
                    </div>
                  </div>
                </div>

                {/* Price & Actions */}
                <div className="flex flex-row md:flex-col justify-between items-end p-5 md:border-l border-gray-800 bg-black/30">
                  <div className="text-left md:text-right">
                    <p className="text-xs text-gray-400">Số lượng: {item.seatCount} vé</p>
                    <p className="text-2xl font-black text-primary mt-0.5">
                      {Number(item.totalAmount).toLocaleString("vi-VN")} ₫
                    </p>
                  </div>

                  {!isCancelled && (
                    <button
                      onClick={() => handleCancelBooking(item.bookingId)}
                      className="text-xs text-red-400 hover:text-red-300 hover:underline cursor-pointer"
                    >
                      Hủy vé
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-900/40 rounded-2xl border border-white/5 max-w-4xl text-center">
          <TicketIcon className="w-12 h-12 text-gray-600 mb-3" />
          <p className="text-lg text-gray-300 font-medium">Bạn chưa có vé xem phim nào.</p>
          <p className="text-xs text-gray-500 mt-1 mb-6">Hãy chọn bộ phim bạn yêu thích và trải nghiệm ngay!</p>
          <a
            href="/movies"
            className="px-6 py-2.5 bg-primary hover:bg-primary-dull text-white text-sm font-semibold rounded-full transition shadow-lg shadow-primary/30"
          >
            Xem danh sách phim
          </a>
        </div>
      )}
    </div>
  );
}
