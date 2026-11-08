import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  Camera,
  CameraOff,
  ScanLine,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Keyboard,
  Film,
  MapPin,
  Clock,
  Calendar,
  Ticket,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { api } from "../../lib/api";
import { Title } from "../../components/admin/Title";
import { useAuth } from "../../context/AuthContext";

const canCheckIn = (role) => role === "Admin" || role === "Staff";

export function CheckInTickets() {
  const { user } = useAuth();
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const readerRef = useRef(null);
  const processingRef = useRef(false);
  const lastTokenRef = useRef("");

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualToken, setManualToken] = useState("");

  const stopCamera = useCallback(() => {
    try {
      controlsRef.current?.stop();
    } catch {
      /* ignore */
    }
    controlsRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const submitToken = useCallback(async (token) => {
    const value = (token || "").trim();
    if (!value || processingRef.current) return;
    processingRef.current = true;
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post("/api/tickets/check-in", { qrToken: value });
      setResult({ success: true, ...res });
    } catch (err) {
      setResult({ success: false, message: err?.message || "Không thể check-in." });
    } finally {
      setLoading(false);
      processingRef.current = false;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Trình duyệt không hỗ trợ truy cập camera. Vui lòng dùng nhập mã thủ công.");
      return;
    }

    stopCamera();
    lastTokenRef.current = "";
    setResult(null);

    try {
      if (!readerRef.current) readerRef.current = new BrowserMultiFormatReader();
      const controls = await readerRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (decoded, _err, ctrl) => {
          if (!decoded) return;
          const text = decoded.getText();
          if (!text || text === lastTokenRef.current) return;
          lastTokenRef.current = text;
          try {
            ctrl?.stop();
          } catch {
            /* ignore */
          }
          controlsRef.current = null;
          setCameraOn(false);
          submitToken(text);
        },
      );
      controlsRef.current = controls;
      setCameraOn(true);
    } catch (err) {
      setCameraOn(false);
      const name = err?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setCameraError("Bạn đã từ chối quyền truy cập camera. Hãy cấp quyền trong cài đặt trình duyệt rồi thử lại.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setCameraError("Không tìm thấy thiết bị camera trên máy này.");
      } else {
        setCameraError("Không thể mở camera: " + (err?.message || "lỗi không xác định"));
      }
    }
  }, [stopCamera, submitToken]);

  const handleScanAgain = useCallback(() => {
    setResult(null);
    startCamera();
  }, [startCamera]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const value = manualToken.trim();
    if (!value) return;
    lastTokenRef.current = "";
    submitToken(value);
    setManualToken("");
  };

  if (user && !canCheckIn(user.role)) {
    return (
      <main className="max-w-[1400px] pb-10 text-slate-100">
        <div className="flex flex-col gap-1 mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Vận hành</p>
          <Title text1="Soát Vé" text2="Check-in QR" />
        </div>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-900/60 bg-red-950/30 p-10 text-center">
          <AlertTriangle className="h-10 w-10 text-red-400" />
          <p className="text-lg font-semibold text-white">Bạn không có quyền check-in vé</p>
          <p className="text-sm text-slate-400">Chức năng này chỉ dành cho nhân viên rạp hoặc quản trị viên.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-[1400px] pb-10 text-slate-100">
      <div className="flex flex-col gap-1 mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Vận hành</p>
        <Title text1="Soát Vé" text2="Check-in QR" />
        <p className="text-sm text-slate-500">
          Quét mã QR trên vé điện tử của khách để xác thực và check-in tại cửa rạp.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Khung camera ── */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold text-white">Camera quét QR</h2>
            </div>
            <div className="flex gap-2">
              {cameraOn ? (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                >
                  <CameraOff className="h-4 w-4" />
                  Tắt camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startCamera}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/15 px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/25"
                >
                  <Camera className="h-4 w-4" />
                  Bật camera
                </button>
              )}
            </div>
          </div>

          <div className="relative mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-black">
            <video
              ref={videoRef}
              className="aspect-video w-full object-cover"
              muted
              playsInline
            />
            {!cameraOn && !loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-500">
                <CameraOff className="h-10 w-10" />
                <p className="text-xs">Camera đang tắt</p>
              </div>
            )}
            {cameraOn && !loading && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-48 w-48 rounded-2xl border-2 border-primary/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>
            )}
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-white">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs">Đang kiểm tra vé…</p>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-900/60 bg-red-950/40 px-3 py-2.5 text-xs text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleScanAgain}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Quét lại
            </button>
            <button
              type="button"
              onClick={() => setManualOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <Keyboard className="h-4 w-4" />
              {manualOpen ? "Ẩn nhập thủ công" : "Nhập mã thủ công"}
            </button>
          </div>

          {manualOpen && (
            <form onSubmit={handleManualSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Dán QRToken để kiểm thử…"
                className="h-10 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 font-mono text-sm text-slate-200 outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={loading || !manualToken.trim()}
                className="h-10 rounded-xl border border-primary/40 bg-primary/15 px-4 text-xs font-bold text-primary transition hover:bg-primary/25 disabled:opacity-50"
              >
                Kiểm tra vé
              </button>
            </form>
          )}
        </section>

        {/* ── Khung kết quả ── */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold text-white">Kết quả check-in</h2>
          </div>

          <div className="mt-4">
            {loading && (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 py-14 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs">Đang xác thực vé…</p>
              </div>
            )}

            {!loading && !result && (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 py-14 text-center text-slate-500">
                <ScanLine className="h-10 w-10" />
                <p className="text-sm">Chưa có kết quả</p>
                <p className="text-xs">Bật camera và quét mã QR trên vé, hoặc nhập mã thủ công.</p>
              </div>
            )}

            {!loading && result && result.success && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-800 bg-emerald-950/40 p-4">
                  <CheckCircle2 className="h-9 w-9 shrink-0 text-emerald-400" />
                  <div>
                    <p className="text-base font-bold text-emerald-300">Vé hợp lệ</p>
                    <p className="text-xs text-emerald-200/80">{result.message || "Check-in thành công!"}</p>
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
                  <InfoRow icon={Film} label="Phim" value={result.movieTitle} />
                  <InfoRow icon={Calendar} label="Ngày chiếu" value={result.showDate} />
                  <InfoRow icon={Clock} label="Giờ chiếu" value={result.startTime} />
                  <InfoRow icon={MapPin} label="Rạp / Phòng" value={[result.cinemaName, result.roomName].filter(Boolean).join(" · ")} />
                  <InfoRow icon={Ticket} label="Ghế" value={result.seatLabel} />
                  <InfoRow icon={Ticket} label="Mã vé" value={result.ticketCode} mono />
                  <InfoRow
                    icon={Clock}
                    label="Thời điểm check-in"
                    value={result.checkedInAt ? new Date(result.checkedInAt).toLocaleString("vi-VN") : ""}
                  />
                </div>
              </div>
            )}

            {!loading && result && !result.success && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-2xl border border-red-900/60 bg-red-950/40 p-4">
                  <XCircle className="h-9 w-9 shrink-0 text-red-400" />
                  <div>
                    <p className="text-base font-bold text-red-300">Từ chối check-in</p>
                    <p className="text-xs text-red-200/80">{result.message}</p>
                  </div>
                </div>

                {(result.movieTitle || result.ticketCode || result.seatLabel) && (
                  <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
                    <InfoRow icon={Film} label="Phim" value={result.movieTitle} />
                    <InfoRow icon={Calendar} label="Ngày chiếu" value={result.showDate} />
                    <InfoRow icon={Clock} label="Giờ chiếu" value={result.startTime} />
                    <InfoRow icon={MapPin} label="Rạp / Phòng" value={[result.cinemaName, result.roomName].filter(Boolean).join(" · ")} />
                    <InfoRow icon={Ticket} label="Ghế" value={result.seatLabel} />
                    <InfoRow icon={Ticket} label="Mã vé" value={result.ticketCode} mono />
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoRow({ icon: Icon, label, value, mono }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </span>
      <span className={`text-right font-medium text-white ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
