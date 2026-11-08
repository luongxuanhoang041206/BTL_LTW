import { useState } from "react";
import {
  Ticket,
  QrCode,
  Printer,
  Download,
  Copy,
  Check,
  Calendar,
  Clock,
  MapPin,
  Film,
  Sparkles,
  UtensilsCrossed,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

// Trạng thái vé điện tử -> translation key + màu.
const TICKET_STATUS = {
  Issued: { labelKey: "ticket.statusIssued", className: "border-green-500/40 bg-green-500/15 text-green-400" },
  Used: { labelKey: "ticket.statusUsed", className: "border-gray-500/40 bg-gray-500/15 text-gray-300" },
  Cancelled: { labelKey: "ticket.statusCancelled", className: "border-red-500/40 bg-red-500/15 text-red-400" },
};

const statusMeta = (status) => TICKET_STATUS[status] || { labelKey: "ticket.statusNotIssued", className: "border-white/20 bg-white/10 text-gray-300" };

export function TicketCard({ ticket }) {
  const { t } = useTranslation();
  const [copiedId, setCopiedId] = useState(null);

  if (!ticket) return null;

  const ticketCode = ticket.ticketCode || `MB-${ticket.bookingId.toString().padStart(6, "0")}`;
  const bookingQrEndpoint = `/api/booking/${ticket.bookingId}/ticket-qr`;
  const fallbackQr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(ticketCode)}`;

  // Danh sách vé điện tử theo từng ghế (nếu backend đã phát hành).
  const tickets = Array.isArray(ticket.tickets)
    ? ticket.tickets.filter((t) => t && t.qrImageUrl)
    : [];

  const handleCopyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success(t("ticket.copied"));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const downloadQr = async (endpoint, name) => {
    try {
      const response = await fetch(endpoint, { credentials: "include" });
      if (!response.ok) throw new Error("QR not available");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `QR-${name}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t("ticket.downloadSuccess"));
    } catch {
      const a = document.createElement("a");
      a.href = fallbackQr;
      a.download = `QR-${name}.png`;
      a.target = "_blank";
      a.click();
    }
  };

  const handleDownloadQR = () => {
    if (tickets.length > 0) {
      downloadQr(tickets[0].qrImageUrl, tickets[0].ticketCode || tickets[0].seatLabel);
      return;
    }
    downloadQr(bookingQrEndpoint, ticketCode);
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-6 print:m-0 print:p-0">
      {/* Vỏ bao vé rạp với viền neon & đổ bóng rạp phim */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-gray-900 via-gray-950 to-black shadow-2xl shadow-primary/10">
        
        {/* Banner đầu vé: Thương hiệu & Trạng thái */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent px-6 py-4 md:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-black shadow-md shadow-primary/30">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-widest text-primary uppercase">
                {t("ticket.header")}
              </span>
              <p className="text-xs text-gray-400">
                {t("ticket.orderCode")} <strong className="text-white">#{ticket.bookingId}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/40 bg-green-500/15 px-3 py-1 text-xs font-semibold text-green-400 shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t("ticket.paid")}
            </span>
          </div>
        </div>

        {/* Nội dung chính của vé: Cột thông tin phim + Cuống vé QR */}
        <div className="grid grid-cols-1 md:grid-cols-12">
          
          {/* CỘT TRÁI (8/12): Thông tin phim & Suất chiếu */}
          <div className="p-6 md:col-span-7 lg:col-span-8 md:p-8 space-y-6">
            
            {/* Poster & Tên Phim */}
            <div className="flex flex-col sm:flex-row gap-5">
              <img
                src={
                  ticket.posterUrl ||
                  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800"
                }
                alt={ticket.movieTitle}
                className="h-44 w-32 shrink-0 rounded-2xl object-cover shadow-lg border border-white/15"
                onError={(e) => {
                  e.target.src =
                    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800";
                }}
              />
              <div className="flex flex-col justify-between py-1">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-primary/20 px-2 py-0.5 text-[11px] font-bold text-primary border border-primary/30">
                      {ticket.roomType || "2D Digital"}
                    </span>
                    {ticket.duration ? (
                      <span className="text-xs text-gray-400">
                        {t("ticket.minutes", { count: ticket.duration })}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-2 text-2xl font-black text-white tracking-tight leading-snug">
                    {ticket.movieTitle}
                  </h2>
                </div>

                <div className="mt-3 space-y-1 text-sm text-gray-300">
                  <p className="flex items-center gap-2 text-gray-300">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-semibold text-white">
                      {ticket.cinemaName}
                    </span>
                    {ticket.roomName && (
                      <span className="text-gray-400">· {ticket.roomName}</span>
                    )}
                  </p>
                  {ticket.cinemaAddress && (
                    <p className="pl-6 text-xs text-gray-400 line-clamp-1">
                      {ticket.cinemaAddress}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Khối Lịch chiếu & Chỗ ngồi */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs">
              <div className="space-y-1">
                <span className="text-gray-400 flex items-center gap-1 font-medium">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> {t("ticket.showDate")}
                </span>
                <p className="text-sm font-bold text-white">
                  {ticket.showDate}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-gray-400 flex items-center gap-1 font-medium">
                  <Clock className="h-3.5 w-3.5 text-primary" /> {t("ticket.showTime")}
                </span>
                <p className="text-sm font-bold text-primary">
                  {ticket.startTime ? ticket.startTime.substring(0, 5) : "--:--"}
                  {ticket.endTime && ` ~ ${ticket.endTime.substring(0, 5)}`}
                </p>
              </div>

              <div className="col-span-2 sm:col-span-1 space-y-1">
                <span className="text-gray-400 flex items-center gap-1 font-medium">
                  <Film className="h-3.5 w-3.5 text-primary" /> {t("ticket.room")}
                </span>
                <p className="text-sm font-bold text-white">
                  {ticket.roomName || t("ticket.mainRoom")}
                </p>
              </div>
            </div>

            {/* Danh sách ghế ngồi */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                {t("ticket.selectedSeats", { count: ticket.seats?.length || 0 })}
              </p>
              <div className="flex flex-wrap gap-2">
                {ticket.seats && ticket.seats.length > 0 ? (
                  ticket.seats.map((seat, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-sm font-extrabold text-primary shadow-sm"
                    >
                      {seat.seatLabel}
                      {seat.seatType && seat.seatType !== "Normal" && (
                        <span className="text-[10px] text-gray-400 font-normal uppercase">
                          ({seat.seatType})
                        </span>
                      )}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-500">{t("ticket.noSeatInfo")}</span>
                )}
              </div>
            </div>

            {/* Đồ ăn & Combo (nếu có) */}
            {((ticket.combos && ticket.combos.length > 0) || (ticket.foods && ticket.foods.length > 0)) && (
              <div className="rounded-2xl border border-white/5 bg-black/30 p-3.5 text-xs space-y-2">
                <p className="font-semibold text-gray-300 flex items-center gap-1.5">
                  <UtensilsCrossed className="h-3.5 w-3.5 text-primary" /> {t("ticket.fnbServices")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {ticket.combos?.map((combo, idx) => (
                    <span
                      key={`combo-${idx}`}
                      className="rounded-lg bg-white/5 px-2.5 py-1 text-gray-200 border border-white/10"
                    >
                      {combo.comboName} × <strong>{combo.quantity}</strong>
                    </span>
                  ))}
                  {ticket.foods?.map((food, idx) => (
                    <span
                      key={`food-${idx}`}
                      className="rounded-lg bg-white/5 px-2.5 py-1 text-gray-200 border border-white/10"
                    >
                      {food.foodName} × <strong>{food.quantity}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Giá tiền & Thanh toán */}
            <div className="flex items-center justify-between border-t border-white/10 pt-4">
              <div>
                <span className="text-xs text-gray-400">{t("ticket.totalPayment")}</span>
                <p className="text-2xl font-black text-primary">
                  {Number(ticket.totalAmount).toLocaleString("vi-VN")} ₫
                </p>
              </div>
              <div className="text-right text-xs text-gray-400">
                <p>{t("ticket.paymentMethod")} {ticket.paymentMethod || t("ticket.bankSePay")}</p>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  {ticket.paidAt ? new Date(ticket.paidAt).toLocaleString("vi-VN") : t("ticket.paidAt")}
                </p>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (Cuống vé & QR check-in) */}
          <div className="relative flex flex-col justify-between border-t md:border-t-0 md:border-l border-dashed border-white/20 bg-gradient-to-b from-gray-950 to-black p-6 md:col-span-5 lg:col-span-4">
            
            {/* Hiệu ứng khuyết notch vé rạp (Ticket Notch Cutouts) */}
            <div className="hidden md:block absolute -left-3 -top-3 h-6 w-6 rounded-full bg-gray-900 border border-primary/20" />
            <div className="hidden md:block absolute -left-3 -bottom-3 h-6 w-6 rounded-full bg-gray-900 border border-primary/20" />

            <div className="w-full">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                <QrCode className="h-4 w-4" />
                {t("ticket.checkInCode")}
              </div>
              <p className="mt-1 text-center text-[11px] text-gray-400">
                {tickets.length > 1
                  ? t("ticket.multiQrHint")
                  : t("ticket.singleQrHint")}
              </p>

              {tickets.length > 0 ? (
                /* DANH SÁCH VÉ ĐIỆN TỬ THEO TỪNG GHẾ */
                <div className="mt-4 space-y-4">
                  {tickets.map((tk) => {
                    const meta = statusMeta(tk.status);
                    return (
                      <div
                        key={tk.ticketId}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-xs font-extrabold text-primary">
                            {tk.seatLabel || t("ticket.seat")}
                            {tk.seatType && tk.seatType !== "Normal" && (
                              <span className="text-[10px] font-normal text-gray-400 uppercase">
                                ({tk.seatType})
                              </span>
                            )}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.className}`}
                          >
                            {t(meta.labelKey)}
                          </span>
                        </div>

                        <div className="mt-3 flex justify-center">
                          <div className="group relative rounded-2xl bg-white p-2.5 shadow-xl shadow-black/60">
                            <img
                              src={tk.qrImageUrl}
                              alt={`QR Code ${tk.ticketCode}`}
                              className="aspect-square w-40 max-w-full rounded-lg object-contain transition duration-300 group-hover:scale-105"
                              onError={(e) => {
                                e.target.src = fallbackQr;
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 opacity-0 transition group-hover:opacity-100">
                              <span className="rounded-full bg-black/80 px-2.5 py-1 text-[11px] font-bold text-white shadow">
                                {t("ticket.scanAtDoor")}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                            {t("ticket.ticketCodeLabel")}
                          </span>
                          <div className="mt-1 flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 font-mono text-xs font-black text-primary select-all">
                            <span className="truncate">{tk.ticketCode}</span>
                            <button
                              onClick={() => handleCopyCode(tk.ticketCode, tk.ticketId)}
                              title={t("ticket.copyCode")}
                              className="shrink-0 cursor-pointer p-1 transition hover:text-white"
                            >
                              {copiedId === tk.ticketId ? (
                                <Check className="h-4 w-4 text-green-400" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {tk.checkedInAt && (
                          <p className="mt-2 text-center text-[10px] text-gray-400">
                            {t("ticket.checkedInAt", { date: new Date(tk.checkedInAt).toLocaleString("vi-VN") })}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* FALLBACK: CHƯA PHÁT HÀNH VÉ -> DÙNG QR THEO BOOKING */
                <div className="flex flex-col items-center">
                  <div className="group relative mt-4 rounded-2xl bg-white p-3 shadow-xl shadow-black/60">
                    <img
                      src={bookingQrEndpoint}
                      alt={`QR Code ${ticketCode}`}
                      className="aspect-square w-48 max-w-full rounded-lg object-contain transition duration-300 group-hover:scale-105"
                      onError={(e) => {
                        e.target.src = fallbackQr;
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 opacity-0 transition group-hover:opacity-100">
                      <span className="rounded-full bg-black/80 px-2.5 py-1 text-[11px] font-bold text-white shadow">
                        {t("ticket.scanAtDoor")}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 w-full">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      {t("ticket.ticketCodeUpper")}
                    </span>
                    <div className="mt-1 flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 font-mono text-sm font-black text-primary select-all">
                      <span>{ticketCode}</span>
                      <button
                        onClick={() => handleCopyCode(ticketCode, "booking")}
                        title={t("ticket.copyCode")}
                        className="cursor-pointer p-1 transition hover:text-white"
                      >
                        {copiedId === "booking" ? (
                          <Check className="h-4 w-4 text-green-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* CÁC NÚT TÁC VỤ IN / TẢI VÉ */}
            <div className="mt-6 flex w-full flex-col gap-2 print:hidden">
              <button
                onClick={handleDownloadQR}
                className="flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-xs font-semibold text-white transition cursor-pointer"
              >
                <Download className="h-4 w-4 text-primary" />
                {t("ticket.downloadQr")}
              </button>

              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/30 px-4 py-2.5 text-xs font-bold text-primary transition cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                {t("ticket.printTicket")}
              </button>
            </div>

            <p className="mt-4 text-[10px] text-gray-500">
              {t("ticket.disclaimer")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

