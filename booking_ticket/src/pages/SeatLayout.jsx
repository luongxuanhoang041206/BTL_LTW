import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { assets, dummyDateTimeData, dummyShowsData } from "../assets/assets";
import { Loading } from "../components/Loading";
import { ArrowRightIcon, CheckCircle2Icon, ClockIcon, MapPinIcon, ShieldAlertIcon } from "lucide-react";
import { BlurCicle } from "../components/BlurCircle";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import CinemaSeatMap from"./CinemaSeatMap";

export function SeatLayout() {
  const { id, date, showtimeId } = useParams();
  const { user, openLogin } = useAuth();
  const navigate = useNavigate();

  const [seatMap, setSeatMap] = useState(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]); // List of SeatId
  const [selectedSeatLabels, setSelectedSeatLabels] = useState([]); // List of 'A1', 'B2'
  const [lastSelectedKey, setLastSelectedKey] = useState(null); // Ghi nhớ ghế cuối cùng chọn ở 2D
  const [isBooking, setIsBooking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewingSeatKey, setViewingSeatKey] = useState(null);
  const section3DRef = useRef(null);

  const getSelectionStorageKey = (targetShowtimeId) =>
    `booking:selected-seats:${id}:${targetShowtimeId}`;

  const restoreLocalSelection = (map) => {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem(getSelectionStorageKey(map.showtimeId)) || "[]"
      );
      const availableSeats = map.rows
        .flatMap((row) => row.seats)
        .filter((seat) => seat.status === "Available" || seat.isHeldByCurrentUser);
      const restoredIds = [...new Set(saved)]
        .filter((seatId) => Number.isInteger(seatId) && availableSeats.some((seat) => seat.seatId === seatId))
        .slice(0, 5);
      const restoredSeats = restoredIds.map((seatId) =>
        availableSeats.find((seat) => seat.seatId === seatId)
      );

      setSelectedSeatIds(restoredIds);
      setSelectedSeatLabels(restoredSeats.map((seat) => `${seat.seatRow}${seat.seatNumber}`));
      setLastSelectedKey(restoredSeats.length
        ? String(restoredSeats[restoredSeats.length - 1].showtimeSeatId ?? restoredSeats[restoredSeats.length - 1].seatId)
        : null);
    } catch {
      setSelectedSeatIds([]);
      setSelectedSeatLabels([]);
      setLastSelectedKey(null);
    }
  };

  const saveLocalSelection = (seatIds) => {
    try {
      const key = getSelectionStorageKey(seatMap.showtimeId);
      if (seatIds.length) sessionStorage.setItem(key, JSON.stringify(seatIds));
      else sessionStorage.removeItem(key);
    } catch {
      // Lưu lựa chọn là tiện ích; tiếp tục đặt vé nếu sessionStorage không khả dụng.
    }
  };

  // Tự động kích hoạt góc nhìn 3D khi người dùng cuộn xuống phần 3D
  useEffect(() => {
    const target = section3DRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        // Khi người dùng cuộn xuống nhìn thấy ít nhất 20% màn 3D
        if (entry.isIntersecting && lastSelectedKey) {
          setViewingSeatKey(lastSelectedKey);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [lastSelectedKey]);

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
          restoreLocalSelection(data);
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

    const map = {
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
    };
    restoreLocalSelection(map);
    setSeatMap(map);
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
    const seatKey = String(seat.showtimeSeatId ?? seat.seatId);

    if (!isSelected && selectedSeatIds.length >= 5) {
      return toast.error("Bạn chỉ có thể chọn tối đa 5 ghế trong một lần đặt.");
    }

    if (isSelected) {
      const newIds = selectedSeatIds.filter((sId) => sId !== seat.seatId);
      setSelectedSeatIds(newIds);
      setSelectedSeatLabels((prev) => prev.filter((lbl) => lbl !== seatCode));
      saveLocalSelection(newIds);

      if (newIds.length > 0) {
        const lastSeatId = newIds[newIds.length - 1];
        const lastSeat = seatMap.rows.flatMap((r) => r.seats).find((s) => s.seatId === lastSeatId);
        setLastSelectedKey(lastSeat ? String(lastSeat.showtimeSeatId ?? lastSeat.seatId) : null);
      } else {
        setLastSelectedKey(null);
      }
    } else {
      const newIds = [...selectedSeatIds, seat.seatId];
      setSelectedSeatIds(newIds);
      setSelectedSeatLabels((prev) => [...prev, seatCode]);
      saveLocalSelection(newIds);
      setLastSelectedKey(seatKey); // Âm thầm ghi nhớ ghế chọn cuối cùng
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
      // Bước 1: Giữ ghế (Hold) trước khi thanh toán
      const holdRes = await api.post("/api/booking/hold", {
        showtimeId: seatMap.showtimeId,
        seatIds: selectedSeatIds,
      });

      if (!holdRes?.success) {
        toast.error(holdRes?.message || "Không thể giữ ghế, vui lòng thử lại.");
        return;
      }

      // Bước 2: Xác nhận đặt vé và thanh toán
      const res = await api.post("/api/booking/checkout", {
        showtimeId: seatMap.showtimeId,
        seatIds: selectedSeatIds,
        paymentMethod: "VNPay",
      });

      if (res && res.success) {
        saveLocalSelection([]);
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

  const basePrice = Number(seatMap.pricePerSeat) || 75000;
  const VIP_SURCHARGE = 20000; // Phụ thu ghế VIP: +20.000đ

  // Tính giá của từng ghế cụ thể
  const getSeatPrice = (seat) => {
    return seat.seatType === "VIP" ? basePrice + VIP_SURCHARGE : basePrice;
  };

  // Tính tổng tiền chính xác theo từng ghế được chọn
  const selectedSeatsList = seatMap.rows
    .flatMap((r) => r.seats)
    .filter((s) => selectedSeatIds.includes(s.seatId));

  const totalPrice = selectedSeatsList.reduce((sum, seat) => sum + getSeatPrice(seat), 0);

  return (
    <div className="seat-booking-page min-h-screen px-4 md:px-12 lg:px-24 pt-28 pb-20 flex flex-col gap-16 w-full">
      
      {/* ========================================================= */}
      {/* PHẦN 1: CHỌN GHẾ 2D                                       */}
      {/* ========================================================= */}
      <div className="section-2d-booking max-w-5xl mx-auto w-full">
        {/* Showtime Overview Bar */}
        <div className="bg-gray-900/90 border border-primary/20 rounded-2xl p-4 md:p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
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
            <p className="text-xs text-gray-400">Bảng giá vé</p>
            <div className="flex items-center gap-3 mt-0.5 justify-end">
              <span className="text-sm font-semibold text-gray-300">
                Thường: <b className="text-primary">{basePrice.toLocaleString("vi-VN")} ₫</b>
              </span>
              <span className="text-gray-500">|</span>
              <span className="text-sm font-semibold text-amber-300">
                VIP: <b className="text-amber-400">{(basePrice + VIP_SURCHARGE).toLocaleString("vi-VN")} ₫</b>
              </span>
            </div>
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

          {/* Chú thích màu ghế (Legend) có đầy đủ Thường & VIP */}
          <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-gray-300 mb-8 p-3 rounded-xl bg-black/40 border border-white/5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded border border-primary/50 bg-black/40"></span>
              <span>Ghế thường</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded border border-amber-400/80 bg-amber-950/40 text-amber-400 flex items-center justify-center text-[9px] font-bold">★</span>
              <span className="text-amber-300 font-medium">Ghế VIP</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-primary border border-primary shadow-sm shadow-primary/50"></span>
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

          {/* Sơ đồ ghế 2D */}
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
                    const isVip = seat.seatType === "VIP";

                    let seatStyle = isVip
                      ? "border border-amber-400/70 bg-amber-950/20 text-amber-200 hover:border-amber-400 hover:bg-amber-900/30"
                      : "border border-primary/40 bg-black/50 hover:border-primary text-gray-300";

                    if (isBooked) {
                      seatStyle = "bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed opacity-50";
                    } else if (isHolding) {
                      seatStyle = "bg-amber-600/60 border-amber-500 text-amber-200 cursor-not-allowed";
                    } else if (isSelected) {
                      seatStyle = isVip 
                        ? "bg-amber-500 border-amber-400 text-black shadow-md shadow-amber-500/40 scale-105 font-bold"
                        : "bg-primary border-primary text-white shadow-md shadow-primary/40 scale-105 font-bold";
                    }

                    const seatCurrentPrice = getSeatPrice(seat);

                    return (
                      <button
                        key={seat.seatId}
                        disabled={isBooked || isHolding}
                        onClick={() => handleSeatClick(seat)}
                        className={`w-8 h-8 rounded-lg text-xs transition duration-200 cursor-pointer flex items-center justify-center font-medium relative ${seatStyle}`}
                        title={`${seat.seatRow}${seat.seatNumber} (${isVip ? "VIP" : "Thường"}) - ${seatCurrentPrice.toLocaleString("vi-VN")} ₫`}
                      >
                        {seat.seatNumber}
                        {isVip && !isBooked && !isSelected && (
                          <span className="absolute -top-1 -right-1 text-[8px] text-amber-400">★</span>
                        )}
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
          <div className="w-full max-w-2xl mt-10 p-4 md:p-6 bg-gray-900/95 border border-primary/40 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
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

      {/* ========================================================= */}
      {/* PHẦN 2: XEM TẦM MẮT 3D + POPUP SƠ ĐỒ NHỎ Ở GÓC PHẢI      */}
      {/* ========================================================= */}
      <div ref={section3DRef} className="section-3d-preview w-full pt-8 border-t border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-4 md:px-12 lg:px-24">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-6 bg-primary rounded-full inline-block"></span>
              Trải Nghiệm Góc Nhìn 3D Từ Ghế Ngồi
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Chọn ghế ở trên → 3D tự động trỏ tới ghế đó. Hoặc bấm vào sơ đồ nhỏ bên phải để đổi góc nhìn!
            </p>
          </div>

          {viewingSeatKey && (
            <button
              onClick={() => setViewingSeatKey(null)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold rounded-xl border border-gray-600 transition self-start md:self-auto cursor-pointer"
            >
              Quay lại góc nhìn toàn rạp
            </button>
          )}
        </div>

        {/* CONTAINER 3D: kéo full width ra ngoài padding trang */}
        <div className="relative w-full h-[700px] overflow-hidden border-y border-white/10 bg-slate-950 shadow-2xl">
          
          {/* MÀN HÌNH 3D NỀN */}
          <div className="w-full h-full">
            {seatMap.rows && seatMap.rows.length > 0 && (
              <CinemaSeatMap 
                rows={seatMap.rows} 
                activeSeatKey={viewingSeatKey} 
              />
            )}
          </div>

          {/* POPUP SƠ ĐỒ 2D NỔI Ở GÓC PHẢI */}
          <div className="absolute top-4 right-4 z-20 w-72 bg-gray-900/90 backdrop-blur-md p-4 rounded-xl border border-white/15 shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
              <span className="text-xs font-bold text-gray-200 uppercase tracking-wide">
                Bản đồ vị trí
              </span>
              <span className="text-xs text-primary font-bold">
                {viewingSeatKey ? `Ghế đang xem: #${viewingSeatKey}` : "Chọn 1 ghế"}
              </span>
            </div>

            {/* Màn chiếu mini */}
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent rounded mb-3" />

            {/* Danh sách ghế mini */}
            <div className="flex flex-col gap-1.5 max-h-[350px] overflow-y-auto pr-1">
              {seatMap.rows.map((row) => (
                <div key={row.rowLabel} className="flex items-center gap-1.5 justify-center">
                  <span className="text-[10px] text-gray-400 w-3 text-center font-bold">
                    {row.rowLabel}
                  </span>
                  <div className="flex gap-1">
                    {row.seats.map((seat) => {
                      const key = String(seat.showtimeSeatId ?? seat.seatId);
                      const isViewing = String(viewingSeatKey) === key;
                      const isBooked = seat.status === "Booked";

                      return (
                        <button
                          key={key}
                          disabled={isBooked}
                          onClick={() => setViewingSeatKey(key)}
                          title={`Ghế ${row.rowLabel}${seat.seatNumber}`}
                          className={`w-5 h-5 rounded text-[9px] font-semibold transition-all flex items-center justify-center cursor-pointer
                            ${isBooked ? "bg-gray-800 text-gray-600 opacity-40 cursor-not-allowed" : 
                              isViewing ? "bg-primary text-white scale-110 font-bold shadow-lg shadow-primary/60 border border-white" : 
                              "bg-black/60 text-gray-300 hover:bg-primary/50 hover:text-white border border-white/10"
                            }`}
                        >
                          {seat.seatNumber}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
