import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { assets, dummyDateTimeData, dummyShowsData } from "../assets/assets";
import { Loading } from "../components/Loading";
import { ArrowRightIcon, CheckCircle2Icon, ClockIcon, MapPinIcon, ShieldAlertIcon } from "lucide-react";
import { BlurCicle } from "../components/BlurCircle";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function SeatLayout() {
  const { id, date, showtimeId } = useParams();
  const { user, openLogin } = useAuth();
  const navigate = useNavigate();

  const [seatMap, setSeatMap] = useState(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]); // List of SeatId
  const [selectedSeatLabels, setSelectedSeatLabels] = useState([]); // List of 'A1', 'B2'
  const [isBooking, setIsBooking] = useState(false);
  const [loading, setLoading] = useState(true);

  // Lấy dữ liệu sơ đồ ghế từ API Backend
  const fetchSeatMap = async () => {
    setLoading(true);
    try {
      let targetShowtimeId = showtimeId;

      // Nếu không có showtimeId trực tiếp trên URL, thử lấy từ lịch chiếu của phim
      if (!targetShowtimeId) {
        const showtimesRes = await api.get(`/api/movies/${id}/showtimes`).catch(() => null);
        if (showtimesRes?.dayGroups?.length > 0) {
          const firstDay = showtimesRes.dayGroups[0];
          if (firstDay.showtimes?.length > 0) {
            targetShowtimeId = firstDay.showtimes[0].showtimeId;
          }
        }
      }

      if (targetShowtimeId) {
        const data = await api.get(`/api/booking/seatmap/${targetShowtimeId}`);
        if (data && data.rows) {
          setSeatMap(data);
          setLoading(false);
          return;
        }
      }

      // Fallback nếu không có showtimeId
      fallbackToDummy();
    } catch {
      fallbackToDummy();
    } finally {
      setLoading(false);
    }
  };

  const fallbackToDummy = () => {
    const dummyShow = dummyShowsData.find((s) => s._id === id || s.id === Number(id)) || dummyShowsData[0];
    const dummyRows = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"].map((rowLabel) => ({
      rowLabel,
      seats: Array.from({ length: 9 }, (_, i) => ({
        seatId: rowLabel.charCodeAt(0) * 100 + (i + 1),
        showtimeSeatId: rowLabel.charCodeAt(0) * 100 + (i + 1),
        seatRow: rowLabel,
        seatNumber: i + 1,
        seatType: rowLabel >= "E" ? "VIP" : "Normal",
        status: (rowLabel === "C" && i === 3) || (rowLabel === "D" && i === 5) ? "Booked" : "Available",
        isHeldByCurrentUser: false,
      })),
    }));

    setSeatMap({
      showtimeId: Number(showtimeId) || 1,
      movieTitle: dummyShow.title,
      posterUrl: dummyShow.poster_path,
      showDate: date || "2026-09-16",
      startTime: "19:00:00",
      endTime: "21:00:00",
      cinemaName: "RoPhim Cinema",
      roomName: "Phòng VIP 1",
      roomType: "2D Digital",
      pricePerSeat: 75000,
      rows: dummyRows,
    });
  };

  useEffect(() => {
    fetchSeatMap();
  }, [id, showtimeId, date]);

  const handleSeatClick = (seat) => {
    if (seat.status === "Booked") {
      return toast.error("Ghế này đã có người đặt!");
    }
    if (seat.status === "Holding" && !seat.isHeldByCurrentUser) {
      return toast.error("Ghế này đang được người khác giữ chỗ!");
    }

    const seatCode = `${seat.seatRow}${seat.seatNumber}`;
    const isSelected = selectedSeatIds.includes(seat.seatId);

    if (!isSelected && selectedSeatIds.length >= 5) {
      return toast.error("Bạn chỉ có thể chọn tối đa 5 ghế trong một lần đặt.");
    }

    if (isSelected) {
      setSelectedSeatIds((prev) => prev.filter((sId) => sId !== seat.seatId));
      setSelectedSeatLabels((prev) => prev.filter((lbl) => lbl !== seatCode));
    } else {
      setSelectedSeatIds((prev) => [...prev, seat.seatId]);
      setSelectedSeatLabels((prev) => [...prev, seatCode]);
    }
  };

  // Xác nhận đặt vé và thanh toán
  const handleProceedCheckout = async () => {
    if (selectedSeatIds.length === 0) {
      return toast.error("Vui lòng chọn ít nhất một ghế!");
    }

    if (!user) {
      toast("Vui lòng đăng nhập để hoàn tất đặt vé.");
      return openLogin();
    }

    setIsBooking(true);
    try {
      const res = await api.post("/api/booking/checkout", {
        showtimeId: seatMap.showtimeId,
        seatIds: selectedSeatIds,
        paymentMethod: "VNPay",
      });

      if (res && res.success) {
        toast.success("🎉 Đặt vé và thanh toán thành công!");
        navigate("/booking");
      } else {
        toast.error(res?.message || "Đặt vé thất bại, vui lòng thử lại.");
      }
    } catch (err) {
      toast.error(err.message || "Đặt vé thất bại.");
    } finally {
      setIsBooking(false);
    }
  };

  if (loading) return <Loading />;
  if (!seatMap) return null;

  const unitPrice = seatMap.pricePerSeat || 75000;
  const totalPrice = selectedSeatIds.length * unitPrice;

  return (
    <div className="min-h-screen px-4 md:px-12 lg:px-24 pt-28 pb-20">
      {/* Showtime Overview Bar */}
      <div className="max-w-5xl mx-auto bg-gray-900/90 border border-primary/20 rounded-2xl p-4 md:p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <img
            src={seatMap.posterUrl || assets.rophimlogo}
            alt=""
            className="w-16 h-22 object-cover rounded-lg border border-white/10"
            onError={(e) => { e.target.src = assets.rophimlogo; }}
          />
          <div>
            <h2 className="text-xl font-bold text-white">{seatMap.movieTitle}</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mt-1">
              <span className="flex items-center gap-1 text-primary">
                <ClockIcon className="w-3.5 h-3.5" />
                {seatMap.startTime ? seatMap.startTime.substring(0, 5) : "19:00"} - {seatMap.showDate}
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <MapPinIcon className="w-3.5 h-3.5" />
                {seatMap.cinemaName} &bull; {seatMap.roomName} ({seatMap.roomType})
              </span>
            </div>
          </div>
        </div>

        <div className="text-right max-md:text-center">
          <p className="text-xs text-gray-400">Giá vé</p>
          <p className="text-xl font-bold text-primary">
            {Number(unitPrice).toLocaleString("vi-VN")} ₫<span className="text-xs text-gray-400 font-normal"> /ghế</span>
          </p>
        </div>
      </div>

      {/* Seat Map Screen */}
      <div className="relative max-w-4xl mx-auto flex flex-col items-center">
        <BlurCicle top="-50px" left="-50px" />
        <BlurCicle bottom="0" right="0" />

        {/* Màn chiếu */}
        <div className="w-full max-w-xl flex flex-col items-center mb-8">
          <img src={assets.screenImage} alt="Màn hình rạp" className="w-full opacity-80" />
          <p className="text-xs text-gray-400 font-semibold tracking-widest mt-2 uppercase">
            MÀN HÌNH CHIẾU
          </p>
        </div>

        {/* Chú thích màu ghế (Legend) */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-300 mb-8 p-3 rounded-xl bg-black/40 border border-white/5">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded border border-primary/50 bg-black/40"></span>
            <span>Ghế trống</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-primary border border-primary"></span>
            <span>Đang chọn</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-amber-500/80 border border-amber-500"></span>
            <span>Đang giữ chỗ</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-gray-700 border border-gray-600 opacity-60"></span>
            <span>Đã bán</span>
          </div>
        </div>

        {/* Sơ đồ ghế */}
        <div className="flex flex-col items-center gap-2.5 overflow-x-auto pb-4 max-w-full">
          {seatMap.rows.map((row) => (
            <div key={row.rowLabel} className="flex items-center gap-3">
              <span className="w-6 text-center font-bold text-gray-400 text-sm">
                {row.rowLabel}
              </span>
              <div className="flex items-center gap-2">
                {row.seats.map((seat) => {
                  const isSelected = selectedSeatIds.includes(seat.seatId);
                  const isBooked = seat.status === "Booked";
                  const isHolding = seat.status === "Holding" && !seat.isHeldByCurrentUser;

                  let seatStyle = "border border-primary/40 bg-black/50 hover:border-primary text-gray-300";
                  if (isBooked) {
                    seatStyle = "bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed opacity-50";
                  } else if (isHolding) {
                    seatStyle = "bg-amber-600/60 border-amber-500 text-amber-200 cursor-not-allowed";
                  } else if (isSelected) {
                    seatStyle = "bg-primary border-primary text-white shadow-md shadow-primary/40 scale-105 font-bold";
                  }

                  return (
                    <button
                      key={seat.seatId}
                      disabled={isBooked || isHolding}
                      onClick={() => handleSeatClick(seat)}
                      className={`w-8 h-8 rounded-lg text-xs transition duration-200 cursor-pointer flex items-center justify-center font-medium ${seatStyle}`}
                      title={`${seat.seatRow}${seat.seatNumber} (${seat.seatType || "Thường"}) - ${Number(unitPrice).toLocaleString("vi-VN")} ₫`}
                    >
                      {seat.seatNumber}
                    </button>
                  );
                })}
              </div>
              <span className="w-6 text-center font-bold text-gray-400 text-sm">
                {row.rowLabel}
              </span>
            </div>
          ))}
        </div>

        {/* Thanh tóm tắt và Thanh toán ở dưới */}
        <div className="sticky bottom-6 w-full max-w-2xl mt-10 p-4 md:p-6 bg-gray-900/95 border border-primary/40 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-400">
              Ghế đang chọn:{" "}
              <span className="text-white font-bold">
                {selectedSeatLabels.length > 0 ? selectedSeatLabels.join(", ") : "Chưa chọn"}
              </span>
            </p>
            <p className="text-xl font-extrabold text-primary mt-0.5">
              {Number(totalPrice).toLocaleString("vi-VN")} ₫
            </p>
          </div>

          <button
            onClick={handleProceedCheckout}
            disabled={isBooking || selectedSeatIds.length === 0}
            className="w-full sm:w-auto px-8 py-3 bg-primary hover:bg-primary-dull disabled:opacity-50 text-white font-bold rounded-xl transition cursor-pointer shadow-lg shadow-primary/30 active:scale-95 flex items-center justify-center gap-2"
          >
            {isBooking ? "Đang xử lý..." : "Xác nhận & Thanh toán"}
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
