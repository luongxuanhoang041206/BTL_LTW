import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { CheckCircle2, Clock3, RefreshCw, QrCodeIcon, Smartphone, X } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { Loading } from "../components/Loading";
import { useAuth } from "../context/AuthContext";

const isDev = import.meta.env.DEV;

export function Payment() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user, openLogin } = useAuth();

  const [info, setInfo] = useState(null);
  const [status, setStatus] = useState("Pending");
    const [showBank, setShowBank] = useState(false);    
    const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


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
    } catch (err) {
      setError(err.message || "Không thể tạo thông tin thanh toán SePay.");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (user) createPayment();
  }, [user, createPayment]);

    const handleSimulate = async () => {
        if (!info) return;
        setConfirming(true);
        try {
            await api.post(`/api/payment/simulate/${info.paymentId}`, {});
            setShowBank(false);
            setStatus("Success");
            toast.success("Thanh toán thành công! Vé của bạn đã được xác nhận.");
            window.setTimeout(() => navigate("/booking"), 1800);
        } catch (err) {
            toast.error(err.message || "Giả lập chuyển khoản thất bại.");
        } finally {
            setConfirming(false);
        }
    };

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
          toast.success("Thanh toán thành công! Vé của bạn đã được xác nhận.");
          window.setTimeout(() => navigate("/booking"), 1800);
        } else if (result.status === "Failed") {
          toast.error("Giao dịch thất bại. Vui lòng thử lại.");
        }
      } catch {
        // Giữ trạng thái hiện tại khi API chưa phản hồi
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [info, status, navigate]);

  // -------------------------------------------------------------------------
  // Guard — chưa đăng nhập
  // -------------------------------------------------------------------------
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 pt-24 text-center text-white">
        <p className="mb-4">Vui lòng đăng nhập để tiếp tục thanh toán.</p>
        <button
          onClick={openLogin}
          className="rounded-lg bg-primary px-5 py-2 font-semibold"
        >
          Đăng nhập
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
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
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold hover:bg-primary-dull transition"
            >
              <RefreshCw className="h-4 w-4" />
              Thử lại
            </button>
          </div>
        ) : (
          info && (
            <div className="mt-8 grid gap-8 md:grid-cols-2">

              {/* QR code */}
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
                      ? "Đã nhận thanh toán. Đang chuyển đến vé của bạn…"
                      : "Đang chờ xác nhận từ SePay…"}
                  </span>
                </div>

                {isDev && status !== "Success" && (
                    <button
                        type="button"
                        onClick={() => setShowBank(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10"
                    >
                        <Smartphone className="h-4 w-4" />
                        Mở app ngân hàng giả lập (chỉ để demo)
                    </button>
                )}
                <p className="text-xs text-gray-500">
                  Mã thanh toán #{info.paymentId} · Không đóng trang trong khi chờ
                  xác nhận.
                </p>
              </div>
            </div>
          )
        )}

        {/* Footer */}
        <div className="mt-8 border-t border-white/10 pt-5 text-sm">
          <Link to="/booking" className="text-gray-400 hover:text-white transition">
            Xem vé của tôi
          </Link>
        </div>
          </section>
          {showBank && info && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
                  <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white text-gray-900 shadow-2xl">
                      <div className="flex items-center justify-between bg-blue-700 px-4 py-3 text-white">
                          <span className="font-semibold">Xác nhận chuyển tiền</span>
                          <button type="button" onClick={() => setShowBank(false)} disabled={confirming}>
                              <X className="h-5 w-5" />
                          </button>
                      </div>

                      <div className="space-y-3 p-5 text-sm">
                          <div className="text-center">
                              <p className="text-xs text-gray-500">Số tiền</p>
                              <p className="text-3xl font-extrabold text-blue-700">
                                  {Number(info.amount).toLocaleString("vi-VN")} ₫
                              </p>
                          </div>

                          <div className="space-y-2 rounded-lg bg-gray-100 p-3">
                              <div className="flex justify-between gap-2">
                                  <span className="text-gray-500">Người nhận</span>
                                  <strong className="text-right">{info.accountName}</strong>
                              </div>
                              <div className="flex justify-between gap-2">
                                  <span className="text-gray-500">Số tài khoản</span>
                                  <strong>{info.accountNumber}</strong>
                              </div>
                              <div className="flex justify-between gap-2">
                                  <span className="text-gray-500">Ngân hàng</span>
                                  <strong>{info.bankCode}</strong>
                              </div>
                              <div className="flex justify-between gap-2">
                                  <span className="text-gray-500">Nội dung</span>
                                  <strong className="break-all text-right font-mono text-xs">{info.content}</strong>
                              </div>
                          </div>

                          <p className="text-center text-xs text-gray-400">
                              Màn hình giả lập phục vụ demo, không có tiền thật được chuyển.
                          </p>

                          <button
                              type="button"
                              onClick={handleSimulate}
                              disabled={confirming}
                              className="w-full rounded-lg bg-blue-700 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
                          >
                              {confirming ? "Đang xử lý..." : "Xác nhận chuyển khoản"}
                          </button>
                      </div>
                  </div>
              </div>
          )}
    </main>
  );
}
