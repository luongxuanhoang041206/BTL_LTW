import { ChevronLeftIcon, ChevronRightIcon, ClockIcon, MapPinIcon } from "lucide-react";
import { BlurCicle } from "./BlurCircle";
import { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";

export function DateSelect({ dayGroups = [], dateTime = {}, id }) {
  const navigate = useNavigate();

  // Chuẩn hóa dữ liệu lịch chiếu: ưu tiên dayGroups từ Backend API
  const hasApiGroups = Array.isArray(dayGroups) && dayGroups.length > 0;

  // Lấy danh sách ngày
  const dates = hasApiGroups
    ? dayGroups.map((g) => g.showDate)
    : Object.keys(dateTime || {});

  const [selectedDate, setSelectedDate] = useState(dates[0] || null);

  // Lấy các suất chiếu của ngày đang chọn
  const currentShowtimes = hasApiGroups
    ? dayGroups.find((g) => g.showDate === selectedDate)?.showtimes || []
    : (dateTime && selectedDate && dateTime[selectedDate]) || [];

  const handleSelectShowtime = (showtime) => {
    const showtimeId = showtime.showtimeId || showtime._id || 1;
    navigate(`/movies/${id}/seat/${showtimeId}`);
    scrollTo(0, 0);
  };

  const handleLegacyBook = () => {
    if (!selectedDate) {
      return toast.error("Vui lòng chọn ngày chiếu");
    }
    navigate(`/movies/${id}/${selectedDate}`);
    scrollTo(0, 0);
  };

  return (
    <div id="dateSelect" className="pt-20">
      <div className="relative p-6 md:p-8 bg-gray-900/90 border border-primary/20 rounded-2xl shadow-xl">
        <BlurCicle top="-100px" left="-100px" />
        <BlurCicle top="100px" right="0" />

        {/* Date Selector Header */}
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-white">Chọn Lịch Chiếu</h2>

          {dates.length > 0 ? (
            <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none">
              {dates.map((dateStr) => {
                const dateObj = new Date(dateStr);
                const isSelected = selectedDate === dateStr;
                const dayName = dateObj.toLocaleDateString("vi-VN", { weekday: "short" });
                const dayNum = dateObj.getDate();
                const monthName = dateObj.toLocaleDateString("vi-VN", { month: "short" });

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`flex flex-col items-center justify-center min-w-[70px] h-20 rounded-xl transition cursor-pointer border ${
                      isSelected
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/30"
                        : "bg-black/40 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700"
                    }`}
                  >
                    <span className="text-xs uppercase font-medium">{dayName}</span>
                    <span className="text-lg font-bold my-0.5">{dayNum}</span>
                    <span className="text-[11px] opacity-80">{monthName}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-4">Hiện chưa có lịch chiếu cho phim này.</p>
          )}
        </div>

        {/* Showtimes List for Selected Date */}
        {selectedDate && (
          <div className="mt-8 border-t border-gray-800 pt-6">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              Suất chiếu ngày {new Date(selectedDate).toLocaleDateString("vi-VN")}
            </h3>

            {hasApiGroups ? (
              currentShowtimes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {currentShowtimes.map((st) => (
                    <div
                      key={st.showtimeId}
                      onClick={() => handleSelectShowtime(st)}
                      className="group p-4 rounded-xl bg-black/50 border border-gray-800 hover:border-primary transition cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-white group-hover:text-primary transition flex items-center gap-1.5">
                            <ClockIcon className="w-4 h-4 text-primary" />
                            {st.startTime ? st.startTime.substring(0, 5) : "18:00"}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                            {st.roomType || "2D"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1 truncate">
                          <MapPinIcon className="w-3.5 h-3.5 text-gray-500" />
                          {st.cinemaName} &bull; {st.roomName}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between text-xs">
                        <span className="text-gray-400">
                          {st.availableSeats ?? 50} ghế trống
                        </span>
                        <span className="font-bold text-primary">
                          {st.price ? Number(st.price).toLocaleString("vi-VN") + " ₫" : "75.000 ₫"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Không có suất chiếu nào vào ngày này.</p>
              )
            ) : (
              /* Fallback cho dummy data */
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex flex-wrap gap-3">
                  {currentShowtimes.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={handleLegacyBook}
                      className="px-4 py-2 rounded-lg bg-black/40 border border-primary/40 hover:bg-primary hover:text-white transition text-sm cursor-pointer"
                    >
                      {item.time || "19:00"}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleLegacyBook}
                  className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dull transition cursor-pointer text-sm font-medium"
                >
                  Chọn ghế theo ngày
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
