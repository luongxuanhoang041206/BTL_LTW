import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  Clock3,
  RefreshCw,
  QrCodeIcon,
  Smartphone,
  X,
  Ticket as TicketIcon,
  Sparkles,
  ArrowRight,
  Home,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { Loading } from "../components/Loading";
import { useAuth } from "../context/AuthContext";
import { TicketCard } from "../components/TicketCard";

const isDev = import.meta.env.DEV;

export function Payment() {
  const { t } = useTranslation();
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user, openLogin } = useAuth();

  const [info, setInfo] = useState(null);
  const [status, setStatus] = useState("Pending");
  const [showBank, setShowBank] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmedTicket, setConfirmedTicket] = useState(null);
  const createPaymentRequest = useRef(null);

  // Lấy chi tiết vé sau khi thanh toán thành công.
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

  // Tạo phiên thanh toán SePay.
  const createPayment = useCallback(async () => {
    // Chỉ cho phép 1 thanh toán chạy dở
    if (createPaymentRequest.current) {
      return createPaymentRequest.current;
    }

    setLoading(true);
    setError("");

    const request = (async () => {
      try {
        const result = await api.post("/api/payment/bank", {
          bookingId: Number(bookingId),
        });

        setInfo(result.info);

        // Đơn đã thanh toán trước đó, ví dụ khi người dùng tải lại trang.
        if (result.info?.status === "Success") {
          setStatus("Success");
          await fetchTicketDetails(bookingId);
        }
      } catch (err) {
        setError(err.message || t("payment.errCreatePayment"));
      } finally {
        setLoading(false);
      }
    })();

    createPaymentRequest.current = request;
    try {
      await request;
    } finally {
      createPaymentRequest.current = null;
    }
  }, [bookingId, fetchTicketDetails]);

  useEffect(() => {
    if (user) {
      createPayment();
    }
  }, [user, createPayment]);

  // Giả lập xác nhận chuyển khoản trong modal demo.
  const handleSimulate = async () => {
    if (!info?.paymentId || confirming) return;

    setConfirming(true);

    try {
      await api.post(`/api/payment/simulate/${info.paymentId}`, {});
      setShowBank(false);
      setStatus("Success");
      toast.success(t("payment.toastConfirmed"));
      await fetchTicketDetails(bookingId);
      window.setTimeout(() => navigate("/booking"), 1800);
    } catch (err) {
      toast.error(err.message || t("payment.errSimulate"));
    } finally {
      setConfirming(false);
    }
  };

  // Poll trạng thái thanh toán mỗi 3 giây.
  useEffect(() => {
    if (!info || status === "Success" || status === "Failed") {
      return undefined;
    }

    const timer = window.setInterval(async () => {
      try {
        const result = await api.get(`/api/payment/status/${info.paymentId}`);
        setStatus(result.status);

        if (result.status === "Success") {
          toast.success(t("payment.toastReady"));
          await fetchTicketDetails(bookingId);
        } else if (result.status === "Failed") {
          toast.error(t("payment.toastFailed"));
        }
      } catch {
        // Giữ trạng thái hiện tại nếu API tạm thời chưa phản hồi.
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [info, status, bookingId, fetchTicketDetails]);

  // Guard: người dùng chưa đăng nhập.
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 pt-24 text-center text-white">
        <p className="mb-4">{t("payment.loginRequired")}</p>
        <button
          onClick={openLogin}
          className="rounded-lg bg-primary px-5 py-2 font-semibold text-black cursor-pointer"
        >
          {t("navbar.login")}
        </button>
      </div>
    );
  }

  // Giao diện sau khi thanh toán thành công: hiển thị vé và QR code.
  if (status === "Success") {
    return (
      <main className="min-h-screen px-4 pt-28 pb-20 text-white">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 rounded-3xl border border-green-500/30 bg-gradient-to-r from-green-950/40 via-green-900/20 to-black/60 p-6 text-center shadow-xl backdrop-blur-sm print:hidden md:p-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-green-500/40 bg-green-500/20 text-green-400 shadow-lg shadow-green-500/20 animate-bounce">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-3.5 py-1 text-xs font-bold text-green-400">
              <Sparkles className="h-3.5 w-3.5" />
              {t("payment.transactionComplete")}
            </div>

            <h1 className="text-2xl font-black text-white md:text-3xl">
              {t("payment.successTitle")}
            </h1>

            <p className="mx-auto mt-2 max-w-xl text-sm text-gray-300">
              {t("payment.successDesc")}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/booking"
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-black shadow-lg shadow-primary/25 transition hover:bg-primary-dull"
              >
                <TicketIcon className="h-4 w-4" />
                {t("payment.viewMyTickets")}
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/"
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-white/20"
              >
                <Home className="h-4 w-4" />
                {t("payment.backHome")}
              </Link>
            </div>
          </div>

          {confirmedTicket ? (
            <TicketCard ticket={confirmedTicket} />
          ) : (
            <div className="py-12 text-center">
              <Loading />
              <p className="mt-3 text-xs text-gray-400">
                {t("payment.preparingTicket")}
              </p>
            </div>
          )}
        </div>
      </main>
    );
  }

  // Giao diện chờ thanh toán bằng QR SePay.
  return (
    <main className="min-h-screen px-4 pt-32 pb-20 text-white">
      <section className="mx-auto max-w-3xl rounded-2xl border border-primary/20 bg-gray-900/90 p-6 shadow-xl md:p-9">
        <div className="mb-1 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/20">
            <QrCodeIcon className="h-4 w-4 text-primary" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            {t("payment.orderPayment")}
          </p>
        </div>

        <h1 className="mt-1 text-2xl font-bold">{t("payment.scanTitle")}</h1>
        <p className="mt-2 text-sm text-gray-400">
          {t("payment.scanDesc")}
        </p>

        {loading ? (
          <div className="py-16">
            <Loading />
          </div>
        ) : error ? (
          <div className="mt-8 rounded-xl border border-red-500/30 bg-red-950/30 p-5">
            <p className="text-red-300">{error}</p>
            <button
              onClick={createPayment}
              className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-black transition hover:bg-primary-dull"
            >
              <RefreshCw className="h-4 w-4" />
              {t("common.retry")}
            </button>
          </div>
        ) : (
          info && (
            <div className="mt-8 grid gap-8 md:grid-cols-2">
              {/* QR code SePay */}
              <div className="flex flex-col items-center rounded-xl bg-white p-4 shadow-lg">
                <img
                  src={info.qrUrl}
                  alt={t("payment.qrAlt")}
                  className="aspect-square w-full max-w-xs object-contain"
                />
                <p className="mt-3 text-center text-xs font-medium text-gray-500">
                  {t("payment.scanWithApp")}
                </p>

                <div className="mt-2 flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1">
                  <span className="text-[11px] font-bold text-gray-500">
                    Powered by
                  </span>
                  <span className="text-[11px] font-extrabold text-green-600">
                    SePay
                  </span>
                </div>
              </div>

              {/* Thông tin chuyển khoản */}
              <div className="space-y-4">
                <div className="rounded-xl border border-primary/20 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    {t("payment.amountToPay")}
                  </p>
                  <p className="mt-1 text-3xl font-extrabold text-primary">
                    {Number(info.amount).toLocaleString("vi-VN")} ₫
                  </p>
                </div>

                <div className="space-y-2.5 rounded-xl border border-white/10 bg-black/10 p-4 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="shrink-0 text-gray-400">{t("payment.bank")}</span>
                    <strong className="text-right">{info.bankCode}</strong>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="shrink-0 text-gray-400">{t("payment.accountNumber")}</span>
                    <strong className="select-all text-right">
                      {info.accountNumber}
                    </strong>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="shrink-0 text-gray-400">{t("payment.accountName")}</span>
                    <strong className="text-right">{info.accountName}</strong>
                  </div>

                  <div className="flex justify-between gap-2 border-t border-white/10 pt-2">
                    <span className="shrink-0 text-gray-400">{t("payment.transferContent")}</span>
                    <strong className="break-all text-right font-mono text-xs text-primary">
                      {info.content}
                    </strong>
                  </div>
                </div>

                <div
                  className={`flex items-center gap-3 rounded-xl p-4 text-sm transition ${
                    status === "Success"
                      ? "border border-green-500/30 bg-green-950/40 text-green-200"
                      : "border border-amber-400/20 bg-amber-950/40 text-amber-200"
                  }`}
                >
                  {status === "Success" ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400" />
                  ) : (
                    <Clock3 className="h-5 w-5 shrink-0 animate-pulse" />
                  )}

                  <span>
                    {status === "Success"
                      ? t("payment.paymentReceived")
                      : t("payment.waitingConfirm")}
                  </span>
                </div>

                {/* Chỉ hiển thị công cụ giả lập trên môi trường development. */}
                {isDev && status !== "Success" && (
                  <button
                    type="button"
                    onClick={() => setShowBank(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10"
                  >
                    <Smartphone className="h-4 w-4" />
                    {t("payment.openSimBank")}
                  </button>
                )}

                <p className="text-xs text-gray-500">
                  {t("payment.paymentCodeNote", { id: info.paymentId })}
                </p>
              </div>
            </div>
          )
        )}

        <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-5 text-sm">
          <Link
            to="/booking"
            className="text-gray-400 transition hover:text-white"
          >
            {t("payment.myTickets")}
          </Link>
          <Link
            to="/"
            className="text-xs text-gray-500 transition hover:text-gray-300"
          >
            {t("payment.backHome")}
          </Link>
        </div>
      </section>

      {/* Modal app ngân hàng giả lập của nhánh feature. */}
      {showBank && info && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white text-gray-900 shadow-2xl">
            <div className="flex items-center justify-between bg-blue-700 px-4 py-3 text-white">
              <span className="font-semibold">{t("payment.confirmTransfer")}</span>
              <button
                type="button"
                onClick={() => setShowBank(false)}
                disabled={confirming}
                aria-label={t("payment.closeConfirmDialog")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 p-5 text-sm">
              <div className="text-center">
                <p className="text-xs text-gray-500">{t("payment.amount")}</p>
                <p className="text-3xl font-extrabold text-blue-700">
                  {Number(info.amount).toLocaleString("vi-VN")} ₫
                </p>
              </div>

              <div className="space-y-2 rounded-lg bg-gray-100 p-3">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">{t("payment.recipient")}</span>
                  <strong className="text-right">{info.accountName}</strong>
                </div>

                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">{t("payment.accountNumber")}</span>
                  <strong>{info.accountNumber}</strong>
                </div>

                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">{t("payment.bank")}</span>
                  <strong>{info.bankCode}</strong>
                </div>

                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">{t("payment.content")}</span>
                  <strong className="break-all text-right font-mono text-xs">
                    {info.content}
                  </strong>
                </div>
              </div>

              <p className="text-center text-xs text-gray-400">
                {t("payment.simNote")}
              </p>

              <button
                type="button"
                onClick={handleSimulate}
                disabled={confirming}
                className="w-full rounded-lg bg-blue-700 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
              >
                {confirming ? t("common.processing") : t("payment.confirmTransferBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
