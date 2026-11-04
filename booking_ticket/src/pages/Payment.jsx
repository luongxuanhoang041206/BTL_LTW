import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  CheckCircle2,
  Clock3,
  RefreshCw,
  QrCodeIcon,
  Ticket as TicketIcon,
  Sparkles,
  ArrowRight,
  Home,
  CheckCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { Loading } from "../components/Loading";
import { useAuth } from "../context/AuthContext";
import { TicketCard } from "../components/TicketCard";

export function Payment() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user, openLogin } = useAuth();

  const [info, setInfo] = useState(null);
  const [status, setStatus] = useState("Pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmedTicket, setConfirmedTicket] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // -------------------------------------------------------------------------
  // Lấy chi tiết vé khi đã thanh toán thành công
  // -------------------------------------------------------------------------
  const fetchTicketDetails = useCallback(async (bId) => {
    try {
      const data = await api.get(`/api/booking/details/${bId}`);
      if (data) {
        setConfirmedTicket(data);
      }
    } catch (err) {
      console.error("Không thể tải chi tiết vé:", err);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Tạo phiên thanh toán SePay
  // -------------------------------------------------------------------------
  const createPayment = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.post("/api/payment/bank", {
        bookingId: Number(bookingId),
      });
      setInfo(result.info);

      // Nếu đơn này đã thanh toán rồi (ví dụ reload lại trang thanh toán)
      if (result.info && result.info.status === "Success") {
        setStatus("Success");
        fetchTicketDetails(bookingId);
      }
    } catch (err) {
      setError(err.message || "Không thể tạo thông tin thanh toán SePay.");
    } finally {
      setLoading(false);
    }
  }, [bookingId, fetchTicketDetails]);

  useEffect(() => {
    if (user) createPayment();
  }, [user, createPayment]);

  // -------------------------------------------------------------------------
  // Poll trạng thái thanh toán mỗi 3s
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!info || status === "Success" || status === "Failed") return undefined;

    const timer = window.setInterval(async () => {
      try {
        const result = await api.get(`/api/payment/status/${info.paymentId}`);
        setStatus(result.status);
        if (result.status === "Success") {
          toast.success("Thanh toán thành công! Vé của bạn đã sẵn sàng.");
          fetchTicketDetails(bookingId);
        } else if (result.status === "Failed") {
          toast.error("Giao dịch thất bại. Vui lòng thử lại.");
        }
      } catch {
        // Giữ trạng thái hiện tại khi API chưa phản hồi
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [info, status, bookingId, fetchTicketDetails]);

  // -------------------------------------------------------------------------
  // Dev Helper: Giả lập thanh toán chuyển khoản thành công
  // -------------------------------------------------------------------------
  const handleSimulatePayment = async () => {
    if (!info?.paymentId) return;
    setIsSimulating(true);
    try {
      const res = await api.post(`/api/payment/simulate/${info.paymentId}`, {});
      if (res?.success) {
        toast.success("Đã kích hoạt giả lập thanh toán thành công!");
        setStatus("Success");
        fetchTicketDetails(bookingId);
      }
    } catch (err) {
      toast.error(err.message || "Không thể giả lập thanh toán.");
    } finally {
      setIsSimulating(false);
    }
  };

  // -------------------------------------------------------------------------
  // Guard — chưa đăng nhập
  // -------------------------------------------------------------------------
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 pt-24 text-center text-white">
        <p className="mb-4">Vui lòng đăng nhập để tiếp tục thanh toán.</p>
        <button
          onClick={openLogin}
          className="rounded-lg bg-primary px-5 py-2 font-semibold text-black cursor-pointer"
        >
          Đăng nhập
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // GIAO DIỆN KHI ĐÃ THANH TOÁN THÀNH CÔNG: HIỆN VÉ & QR CODE
  // -------------------------------------------------------------------------
  if (status === "Success") {
    return (
      <main className="min-h-screen px-4 pt-28 pb-20 text-white">
        <div className="mx-auto max-w-4xl">
          {/* Header chúc mừng thanh toán thành công */}
          <div className="mb-6 rounded-3xl border border-green-500/30 bg-gradient-to-r from-green-950/40 via-green-900/20 to-black/60 p-6 md:p-8 text-center shadow-xl backdrop-blur-sm print:hidden">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/20 text-green-400 border border-green-500/40 shadow-lg shadow-green-500/20 mb-4 animate-bounce">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3.5 py-1 text-xs font-bold text-green-400 border border-green-500/20 mb-2">
              <Sparkles className="h-3.5 w-3.5" /> GIAO DỊCH HOÀN TẤT
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">
              Thanh Toán Thành Công!
            </h1>
            <p className="mt-2 text-sm text-gray-300 max-w-xl mx-auto">
              Vé xem phim và mã QR check-in của bạn đã được khởi tạo. Bạn có thể xuất trình mã QR này trực tiếp tại quầy soát vé rạp chiếu phim.
            </p>

            {/* Các nút điều hướng nhanh */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/booking"
                className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary-dull text-black px-5 py-2.5 text-xs font-bold transition shadow-lg shadow-primary/25 cursor-pointer"
              >
                <TicketIcon className="h-4 w-4" />
                Xem danh sách vé của tôi
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 text-xs font-semibold transition cursor-pointer"
              >
                <Home className="h-4 w-4" />
                Về trang chủ
              </Link>
            </div>
          </div>

          {/* Giao diện Thẻ Vé & QR Code Chi Tiết */}
          {confirmedTicket ? (
            <TicketCard ticket={confirmedTicket} />
          ) : (
            <div className="py-12 text-center">
              <Loading />
              <p className="mt-3 text-xs text-gray-400">Đang chuẩn bị vé xem phim của bạn…</p>
            </div>
          )}
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------------------
  // GIAO DIỆN CHỜ THANH TOÁN (QUÉT MÃ QR SEPAY)
  // -------------------------------------------------------------------------
  return (
    <main className="min-h-screen px-4 pt-32 pb-20 text-white">
      <section className="mx-auto max-w-3xl rounded-2xl border border-primary/20 bg-gray-900/90 p-6 shadow-xl md:p-9">

        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <QrCodeIcon className="w-4 h-4 text-primary" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Thanh toán đơn vé
          </p>
        </div>
        <h1 className="mt-1 text-2xl font-bold">Quét mã QR qua SePay</h1>
        <p className="mt-2 text-sm text-gray-400">
          Mở ứng dụng ngân hàng hoặc ví điện tử, quét mã QR bên dưới. Nội dung
          chuyển khoản được điền sẵn để hệ thống tự đối soát qua SePay.
        </p>

        {/* Nội dung chính */}
        {loading ? (
          <div className="py-16">
            <Loading />
          </div>
        ) : error ? (
          <div className="mt-8 rounded-xl border border-red-500/30 bg-red-950/30 p-5">
            <p className="text-red-300">{error}</p>
            <button
              onClick={createPayment}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-black hover:bg-primary-dull transition cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              Thử lại
            </button>
          </div>
        ) : (
          info && (
            <div className="mt-8 grid gap-8 md:grid-cols-2">

              {/* QR code SePay */}
              <div className="flex flex-col items-center rounded-xl bg-white p-4 shadow-lg">
                <img
                  src={info.qrUrl}
                  alt="Mã QR SePay"
                  className="aspect-square w-full max-w-xs object-contain"
                />
                <p className="mt-3 text-center text-xs text-gray-500 font-medium">
                  Quét bằng app ngân hàng hoặc ví điện tử
                </p>
                {/* Badge SePay */}
                <div className="mt-2 flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1">
                  <span className="text-[11px] font-bold text-gray-500">Powered by</span>
                  <span className="text-[11px] font-extrabold text-green-600">SePay</span>
                </div>
              </div>

              {/* Thông tin chuyển khoản */}
              <div className="space-y-4">
                {/* Số tiền */}
                <div className="rounded-xl border border-primary/20 bg-black/20 p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">
                    Số tiền cần thanh toán
                  </p>
                  <p className="mt-1 text-3xl font-extrabold text-primary">
                    {Number(info.amount).toLocaleString("vi-VN")} ₫
                  </p>
                </div>

                {/* Chi tiết tài khoản */}
                <div className="space-y-2.5 rounded-xl border border-white/10 bg-black/10 p-4 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-400 shrink-0">Ngân hàng</span>
                    <strong className="text-right">{info.bankCode}</strong>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-400 shrink-0">Số tài khoản</span>
                    <strong className="text-right select-all">{info.accountNumber}</strong>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-400 shrink-0">Chủ tài khoản</span>
                    <strong className="text-right">{info.accountName}</strong>
                  </div>
                  <div className="flex justify-between gap-2 pt-2 border-t border-white/10">
                    <span className="text-gray-400 shrink-0">Nội dung CK</span>
                    <strong className="text-right select-all text-primary font-mono text-xs break-all">
                      {info.content}
                    </strong>
                  </div>
                </div>

                {/* Trạng thái */}
                <div
                  className={`flex items-center gap-3 rounded-xl p-4 text-sm transition ${
                    status === "Success"
                      ? "bg-green-950/40 border border-green-500/30 text-green-200"
                      : "bg-amber-950/40 border border-amber-400/20 text-amber-200"
                  }`}
                >
                  {status === "Success" ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400" />
                  ) : (
                    <Clock3 className="h-5 w-5 shrink-0 animate-pulse" />
                  )}
                  <span>
                    {status === "Success"
                      ? "Đã nhận thanh toán! Đang hiển thị vé…"
                      : "Đang chờ xác nhận từ SePay…"}
                  </span>
                </div>

                {/* Nút Test giả lập thanh toán nhanh */}
                <div className="pt-1">
                  <button
                    onClick={handleSimulatePayment}
                    disabled={isSimulating}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/10 hover:bg-primary/20 px-3 py-2 text-xs font-semibold text-primary transition cursor-pointer disabled:opacity-50"
                  >
                    <CheckCheck className="h-4 w-4" />
                    {isSimulating ? "Đang xử lý giả lập…" : "Giả lập chuyển khoản thành công (Test nhanh)"}
                  </button>
                </div>

                <p className="text-xs text-gray-500">
                  Mã thanh toán #{info.paymentId} · Không đóng trang trong khi chờ
                  xác nhận.
                </p>
              </div>
            </div>
          )
        )}

        {/* Footer */}
        <div className="mt-8 border-t border-white/10 pt-5 text-sm flex justify-between items-center">
          <Link to="/booking" className="text-gray-400 hover:text-white transition">
            Xem vé của tôi
          </Link>
          <Link to="/" className="text-xs text-gray-500 hover:text-gray-300 transition">
            Về trang chủ
          </Link>
        </div>
      </section>
    </main>
  );
}
