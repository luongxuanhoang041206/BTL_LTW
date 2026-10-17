import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { ArrowLeft, ArrowRight, Clock3, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { assets } from "../assets/assets";
import { Loading } from "../components/Loading";
import { useAuth } from "../context/AuthContext";

const ITEMS_PER_PAGE = 6; // số item mỗi trang
const draftKey = (showtimeId) => `booking:draft:${showtimeId}`;

function readDraft(showtimeId, routeState) {
  if (routeState?.seatIds?.length) return routeState;
  try {
    return JSON.parse(sessionStorage.getItem(draftKey(showtimeId)) || "null");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Component phân trang nhỏ tái sử dụng
// ---------------------------------------------------------------------------
function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition"
        aria-label="Trang trước"
      >
        <ChevronLeftIcon className="w-4 h-4" />
      </button>

      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`w-8 h-8 rounded-lg text-sm font-semibold transition ${
            p === page
              ? "bg-primary text-white"
              : "border border-white/10 text-gray-400 hover:text-white hover:border-white/30"
          }`}
        >
          {p}
        </button>
      ))}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition"
        aria-label="Trang sau"
      >
        <ChevronRightIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function FoodSelection() {
  const { showtimeId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, openLogin } = useAuth();

  const [draft, setDraft] = useState(() => readDraft(showtimeId, location.state));
  const [menu, setMenu] = useState({ foods: [], combos: [] });
  const [seatMap, setSeatMap] = useState(null);
  const [foodQuantities, setFoodQuantities] = useState(() => draft?.foodQuantities || {});
  const [comboQuantities, setComboQuantities] = useState(() => draft?.comboQuantities || {});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Phân trang riêng cho từng section
  const [foodPage, setFoodPage] = useState(1);
  const [comboPage, setComboPage] = useState(1);

  // -------------------------------------------------------------------------
  // Load menu + seat map
  // -------------------------------------------------------------------------
  useEffect(() => {
    const currentDraft = readDraft(showtimeId, location.state);
    setDraft(currentDraft);
    if (!currentDraft?.seatIds?.length) {
      setLoading(false);
      return;
    }
    Promise.all([
      api.get("/api/fnb/menu"),
      api.get(`/api/booking/seatmap/${showtimeId}`),
    ])
      .then(([menuData, mapData]) => {
        setMenu({ foods: menuData.foods || [], combos: menuData.combos || [] });
        setSeatMap(mapData);
      })
      .catch((err) => toast.error(err.message || "Không thể tải thông tin đặt vé."))
      .finally(() => setLoading(false));
  }, [showtimeId, location.state]);

  // -------------------------------------------------------------------------
  // Countdown timer
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!draft?.expiresAt) return undefined;
    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(draft.expiresAt).getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(remaining);
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [draft?.expiresAt]);

  // -------------------------------------------------------------------------
  // Persist draft to sessionStorage khi đổi quantity
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!draft) return;
    const updated = { ...draft, foodQuantities, comboQuantities };
    setDraft(updated);
    sessionStorage.setItem(draftKey(showtimeId), JSON.stringify(updated));
  }, [foodQuantities, comboQuantities]);

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  const changeQuantity = useCallback((setter, id, delta) => {
    setter((current) => ({
      ...current,
      [id]: Math.max(0, Math.min(50, (current[id] || 0) + delta)),
    }));
  }, []);

  const foodTotal = menu.foods.reduce(
    (sum, item) => sum + Number(item.price) * (foodQuantities[item.foodItemId] || 0),
    0
  );
  const comboTotal = menu.combos.reduce(
    (sum, item) => sum + Number(item.price) * (comboQuantities[item.comboId] || 0),
    0
  );
  const selectedSeats =
    seatMap?.rows?.flatMap((row) => row.seats).filter((seat) =>
      draft?.seatIds?.includes(seat.seatId)
    ) || [];
  const seatTotal = selectedSeats.reduce(
    (sum, seat) =>
      sum +
      Number(
        seat.price ||
          (seat.seatType === "VIP" ? seatMap.pricePerSeatVip : seatMap.pricePerSeat) ||
          0
      ),
    0
  );
  const total = seatTotal + foodTotal + comboTotal;
  const formattedTime = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(
    secondsLeft % 60
  ).padStart(2, "0")}`;

  // -------------------------------------------------------------------------
  // Phân trang
  // -------------------------------------------------------------------------
  const foodTotalPages = Math.ceil(menu.foods.length / ITEMS_PER_PAGE);
  const comboTotalPages = Math.ceil(menu.combos.length / ITEMS_PER_PAGE);

  const pagedFoods = menu.foods.slice(
    (foodPage - 1) * ITEMS_PER_PAGE,
    foodPage * ITEMS_PER_PAGE
  );
  const pagedCombos = menu.combos.slice(
    (comboPage - 1) * ITEMS_PER_PAGE,
    comboPage * ITEMS_PER_PAGE
  );

  // Reset về trang 1 khi menu thay đổi
  useEffect(() => { setFoodPage(1); }, [menu.foods.length]);
  useEffect(() => { setComboPage(1); }, [menu.combos.length]);

  // -------------------------------------------------------------------------
  // Checkout — đổi paymentMethod thành SePay
  // -------------------------------------------------------------------------
  const handleCheckout = async () => {
    if (!user) return openLogin();
    if (!draft?.seatIds?.length)
      return toast.error("Không tìm thấy ghế đang giữ. Vui lòng chọn ghế lại.");
    if (secondsLeft <= 0)
      return toast.error("Thời gian giữ ghế đã hết. Vui lòng chọn ghế lại.");

    setSubmitting(true);
    try {
      const result = await api.post("/api/booking/checkout", {
        showtimeId: Number(showtimeId),
        seatIds: draft.seatIds,
        paymentMethod: "SePay", // ← đã đổi từ BANK
        foods: Object.entries(foodQuantities)
          .filter(([, quantity]) => quantity > 0)
          .map(([foodItemId, quantity]) => ({
            foodItemId: Number(foodItemId),
            quantity,
          })),
        combos: Object.entries(comboQuantities)
          .filter(([, quantity]) => quantity > 0)
          .map(([comboId, quantity]) => ({
            comboId: Number(comboId),
            quantity,
          })),
      });
      sessionStorage.removeItem(draftKey(showtimeId));
      sessionStorage.removeItem(
        `booking:selected-seats:${draft.movieId}:${showtimeId}`
      );
      toast.success("Đã tạo đơn. Tiếp tục thanh toán để xác nhận vé.");
      navigate(`/payment/${result.bookingId}`);
    } catch (err) {
      toast.error(err.message || "Không thể tạo đơn đặt vé.");
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render card món ăn / combo
  // -------------------------------------------------------------------------
  const renderCard = (item, type) => {
    const isFood = type === "food";
    const id = isFood ? item.foodItemId : item.comboId;
    const quantities = isFood ? foodQuantities : comboQuantities;
    const setter = isFood ? setFoodQuantities : setComboQuantities;
    const qty = quantities[id] || 0;

    return (
      <article
        key={`${type}-${id}`}
        className="flex gap-4 rounded-xl border border-white/10 bg-gray-900/80 p-4 transition hover:border-primary/30"
      >
        <img
          src={item.imageUrl || assets.rophimlogo}
          alt={item.name}
          className="h-24 w-24 rounded-lg object-cover shrink-0"
          onError={(e) => {
            e.currentTarget.src = assets.rophimlogo;
          }}
        />
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <h3 className="font-semibold text-white">{item.name}</h3>
            <p className="mt-1 line-clamp-2 text-xs text-gray-400">
              {isFood
                ? item.description || item.category
                : item.description ||
                  item.items
                    ?.map((part) => `${part.foodItemName} ×${part.quantity}`)
                    .join(", ")}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="font-bold text-primary">
              {Number(item.price).toLocaleString("vi-VN")} ₫
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeQuantity(setter, id, -1)}
                aria-label={`Giảm ${item.name}`}
                className="h-8 w-8 rounded-full bg-gray-700 hover:bg-gray-600 transition text-white font-bold flex items-center justify-center"
              >
                −
              </button>
              <span className="w-6 text-center font-semibold text-white">{qty}</span>
              <button
                onClick={() => changeQuantity(setter, id, 1)}
                aria-label={`Thêm ${item.name}`}
                className="h-8 w-8 rounded-full bg-primary hover:bg-primary-dull transition text-white font-bold flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  };

  // -------------------------------------------------------------------------
  // Guards
  // -------------------------------------------------------------------------
  if (loading) return <Loading />;

  if (!draft?.seatIds?.length) {
    return (
      <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 pt-28 text-center text-white">
        <h1 className="text-2xl font-bold">Không tìm thấy ghế đang giữ</h1>
        <p className="text-gray-400">Vui lòng chọn ghế trước khi chọn đồ ăn.</p>
        <Link to="/movies" className="rounded-lg bg-primary px-5 py-3 font-semibold">
          Chọn phim
        </Link>
      </main>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <main className="min-h-screen px-4 pb-24 pt-32 text-white md:px-12 lg:px-24">
      <div className="mx-auto max-w-6xl">

        {/* Header — ghế giữ + countdown */}
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-amber-400/30 bg-amber-950/30 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-gray-300">
              Ghế đã giữ:{" "}
              <strong className="text-white">
                {draft.seatLabels?.join(", ") || `${draft.seatIds.length} ghế`}
              </strong>
            </p>
            <h1 className="mt-1 text-2xl font-bold">Chọn bắp nước &amp; combo</h1>
          </div>
          <div className="flex items-center gap-3 text-right">
            <Clock3 className="h-6 w-6 text-amber-300" />
            <div>
              <p className="text-xs text-gray-400">Thời gian giữ ghế còn</p>
              <p
                className={`font-mono text-2xl font-bold ${
                  secondsLeft < 60 ? "text-red-400" : "text-amber-300"
                }`}
              >
                {formattedTime}
              </p>
            </div>
          </div>
        </div>

        {/* Cảnh báo hết giờ */}
        {secondsLeft === 0 && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-200">
            Thời gian giữ ghế đã hết. Hãy quay lại chọn ghế và bắt đầu lại.
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">

          {/* ----------------------------------------------------------------
              Danh sách món — có phân trang
          ---------------------------------------------------------------- */}
          <div className="space-y-10">

            {/* Món lẻ */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Món lẻ</h2>
                {foodTotalPages > 1 && (
                  <span className="text-xs text-gray-400">
                    Trang {foodPage}/{foodTotalPages} · {menu.foods.length} món
                  </span>
                )}
              </div>
              {menu.foods.length ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    {pagedFoods.map((item) => renderCard(item, "food"))}
                  </div>
                  <Pagination
                    page={foodPage}
                    totalPages={foodTotalPages}
                    onPageChange={setFoodPage}
                  />
                </>
              ) : (
                <p className="text-sm text-gray-400">Chưa có món lẻ.</p>
              )}
            </section>

            {/* Combo */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Combo</h2>
                {comboTotalPages > 1 && (
                  <span className="text-xs text-gray-400">
                    Trang {comboPage}/{comboTotalPages} · {menu.combos.length} combo
                  </span>
                )}
              </div>
              {menu.combos.length ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    {pagedCombos.map((item) => renderCard(item, "combo"))}
                  </div>
                  <Pagination
                    page={comboPage}
                    totalPages={comboTotalPages}
                    onPageChange={setComboPage}
                  />
                </>
              ) : (
                <p className="text-sm text-gray-400">Chưa có combo.</p>
              )}
            </section>
          </div>

          {/* ----------------------------------------------------------------
              Sidebar tóm tắt đơn
          ---------------------------------------------------------------- */}
          <aside className="h-fit rounded-2xl border border-primary/20 bg-gray-900/90 p-5 lg:sticky lg:top-28">
            <h2 className="text-lg font-bold">Tóm tắt đơn</h2>
            <p className="mt-2 text-sm text-gray-400">{seatMap?.movieTitle || "Phim"}</p>
            <p className="mt-1 text-xs text-gray-500">
              Ghế: {draft.seatLabels?.join(", ")}
            </p>

            <div className="mt-5 space-y-3 border-t border-white/10 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Vé</span>
                <span>{seatTotal.toLocaleString("vi-VN")} ₫</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Món lẻ</span>
                <span>{foodTotal.toLocaleString("vi-VN")} ₫</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Combo</span>
                <span>{comboTotal.toLocaleString("vi-VN")} ₫</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-3 text-lg font-bold">
                <span>Tổng cộng</span>
                <span className="text-primary">{total.toLocaleString("vi-VN")} ₫</span>
              </div>
            </div>

            {/* Nút thanh toán qua SePay */}
            <button
              onClick={handleCheckout}
              disabled={submitting || secondsLeft <= 0}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-50 hover:bg-primary-dull transition"
            >
              {submitting ? "Đang tạo đơn…" : "Thanh toán qua SePay"}
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              onClick={() =>
                navigate(`/movies/${draft.movieId}/seat/${showtimeId}`)
              }
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-gray-300 hover:text-white hover:border-white/30 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại chọn ghế
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}
