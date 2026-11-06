import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2, ChevronLeft, ChevronRight, Clock, Film,
  RotateCcw, Search, SlidersHorizontal, Ticket, TicketX,
  X, XCircle, Copy, Check, AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { Loading } from "../../components/Loading";
import { Title } from "../../components/admin/Title";

// ── helpers ────────────────────────────────────────────────────────────────

const STATUS_MAP = {
  Paid:      { label: "Đã thanh toán", icon: CheckCircle2, cls: "bg-emerald-950/60 text-emerald-300 border-emerald-800" },
  Pending:   { label: "Chờ thanh toán", icon: Clock,       cls: "bg-yellow-950/60 text-yellow-300 border-yellow-800" },
  Cancelled: { label: "Đã hủy",         icon: TicketX,     cls: "bg-red-950/60 text-red-300 border-red-800" },
  Confirmed: { label: "Đã xác nhận",    icon: CheckCircle2,cls: "bg-sky-950/60 text-sky-300 border-sky-800" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] ?? { label: status, icon: AlertCircle, cls: "bg-slate-800 text-slate-300 border-slate-700" };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
}

function SummaryCard({ label, value, icon: Icon, colorCls }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/80 border border-slate-800">
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      </div>
      <div className={`p-3 rounded-xl bg-slate-800/60 border border-slate-700 ${colorCls}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="ml-1 text-slate-500 hover:text-slate-300 transition" title="Sao chép">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── detail drawer ──────────────────────────────────────────────────────────

function BookingDetailDrawer({ bookingId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api.get(`/api/admin/bookings/${bookingId}`)
      .then(setDetail)
      .catch(err => setError(err.message || "Không thể tải chi tiết."))
      .finally(() => setLoading(false));
  }, [bookingId]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <aside className="flex h-full w-full max-w-xl flex-col border-l border-slate-700 bg-slate-900 shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Chi tiết đặt vé</p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              {detail ? detail.bookingCode : "Đang tải…"}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-xl border border-slate-700 p-2 text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && <Loading />}
          {error  && <p className="text-red-400 text-sm">{error}</p>}
          {detail && !loading && (
            <>
              {/* Movie & showtime */}
              <section className="flex gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                {detail.posterUrl
                  ? <img src={detail.posterUrl} alt="" className="h-28 w-20 rounded-xl object-cover shrink-0" />
                  : <div className="flex h-28 w-20 items-center justify-center rounded-xl bg-slate-800 text-primary shrink-0"><Film className="w-8 h-8" /></div>
                }
                <div className="self-center min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Phim</p>
                  <h3 className="mt-1 text-base font-semibold text-white leading-snug">{detail.movieTitle}</h3>
                  <p className="mt-2 text-xs text-slate-400">{detail.cinemaName} · {detail.roomName}</p>
                  <p className="text-xs text-slate-400">{detail.showDate} · {detail.startTime}–{detail.endTime}</p>
                  <StatusBadge status={detail.status} />
                </div>
              </section>

              {/* Customer */}
              <section>
                <h3 className="mb-3 text-sm font-semibold text-white">Khách hàng</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoBox label="Họ tên" value={detail.customerName} />
                  <InfoBox label="Email" value={detail.customerEmail} />
                  <InfoBox label="Mã vé" value={detail.bookingCode} />
                  <InfoBox label="Ngày đặt" value={new Date(detail.bookingDate).toLocaleString("vi-VN")} />
                </div>
              </section>

              {/* Seats */}
              <section>
                <h3 className="mb-3 text-sm font-semibold text-white">Ghế đã đặt</h3>
                {detail.seats.length === 0
                  ? <p className="text-sm text-slate-500">Không có thông tin ghế.</p>
                  : (
                    <div className="space-y-2">
                      {detail.seats.map((s, i) => (
                        <div key={i} className="flex justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm">
                          <span className="font-mono text-white">{s.seatLabel}</span>
                          <span className="text-slate-400">{s.seatType}</span>
                          <span className="font-medium text-slate-200">{Number(s.price).toLocaleString("vi-VN")} ₫</span>
                        </div>
                      ))}
                    </div>
                  )
                }
              </section>

              {/* Pricing */}
              <section className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-2 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Tạm tính</span>
                  <span>{Number(detail.subTotal).toLocaleString("vi-VN")} ₫</span>
                </div>
                {detail.promoCode && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Khuyến mãi ({detail.promoCode} −{detail.discountPercent}%)</span>
                    <span>−{Number(detail.discountAmount).toLocaleString("vi-VN")} ₫</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-800 pt-2 font-bold text-white">
                  <span>Tổng cộng</span>
                  <span className="text-primary">{Number(detail.totalAmount).toLocaleString("vi-VN")} ₫</span>
                </div>
              </section>

              {/* Payments */}
              {detail.payments.length > 0 && (
                <section>
                  <h3 className="mb-3 text-sm font-semibold text-white">Giao dịch thanh toán</h3>
                  <div className="space-y-2">
                    {detail.payments.map(p => (
                      <div key={p.paymentId} className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">#{p.paymentId} · {p.method}</span>
                          <StatusBadge status={p.status} />
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span className="font-mono">{p.transactionCode || "---"}</span>
                          <span>{Number(p.amount).toLocaleString("vi-VN")} ₫</span>
                        </div>
                        {p.paidAt && <p className="text-slate-500">{p.paidAt}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-100 break-words">{value || "—"}</p>
    </div>
  );
}

// ── main page ──────────────────────────────────────────────────────────────

const emptyFilters = { keyword: "", status: "", cinemaId: "", fromDate: "", toDate: "" };
const PAGE_SIZES = [10, 20, 50];

export function ListBookings() {
  const [summary, setSummary]     = useState(null);
  const [result, setResult]       = useState({ data: [], totalItems: 0, totalPages: 0, currentPage: 1 });
  const [filters, setFilters]     = useState(emptyFilters);
  const [inputKw, setInputKw]     = useState("");
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(15);
  const [sortBy, setSortBy]       = useState("bookingDate");
  const [sortOrder, setSortOrder] = useState("desc");
  const [loading, setLoading]     = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError]         = useState("");
  const [detailId, setDetailId]   = useState(null);
  const debounceRef = useRef(null);

  // debounce keyword
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilters(f => ({ ...f, keyword: inputKw.trim() }));
      setPage(1);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [inputKw]);

  const buildQuery = useCallback(() => {
    const p = new URLSearchParams();
    if (filters.keyword)  p.set("keyword",  filters.keyword);
    if (filters.status)   p.set("status",   filters.status);
    if (filters.cinemaId) p.set("cinemaId", filters.cinemaId);
    if (filters.fromDate) p.set("fromDate", filters.fromDate);
    if (filters.toDate)   p.set("toDate",   filters.toDate);
    p.set("sortBy", sortBy); p.set("sortOrder", sortOrder);
    p.set("page", page); p.set("pageSize", pageSize);
    return p.toString();
  }, [filters, page, pageSize, sortBy, sortOrder]);

  // load list
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    api.get(`/api/admin/bookings?${buildQuery()}`)
      .then(res => { if (active) setResult({ data: res.data ?? [], totalItems: res.totalItems ?? 0, totalPages: res.totalPages ?? 0, currentPage: res.currentPage ?? page }); })
      .catch(err => { if (active) setError(err.message || "Không thể tải dữ liệu."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [buildQuery]);

  // load summary — same filter but no pagination
  useEffect(() => {
    let active = true;
    setSummaryLoading(true);
    const sp = new URLSearchParams();
    if (filters.keyword)  sp.set("keyword",  filters.keyword);
    if (filters.status)   sp.set("status",   filters.status);
    if (filters.cinemaId) sp.set("cinemaId", filters.cinemaId);
    if (filters.fromDate) sp.set("fromDate", filters.fromDate);
    if (filters.toDate)   sp.set("toDate",   filters.toDate);
    api.get(`/api/admin/bookings/summary?${sp.toString()}`)
      .then(res => { if (active) setSummary(res); })
      .catch(() => {})
      .finally(() => { if (active) setSummaryLoading(false); });
    return () => { active = false; };
  }, [filters]);

  const resetFilters = () => {
    setFilters(emptyFilters); setInputKw(""); setPage(1);
    setSortBy("bookingDate"); setSortOrder("desc");
  };
  const changeSort = key => {
    if (sortBy === key) setSortOrder(o => o === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortOrder("asc"); }
    setPage(1);
  };

  return (
    <main className="max-w-[1400px] pb-10 text-slate-100">
      {/* header */}
      <div className="flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Quản trị vận hành</p>
          <Title text1="Quản Lý" text2="Đặt Vé" />
          <p className="text-sm text-slate-500 mt-1">Theo dõi, tìm kiếm và xem chi tiết toàn bộ đơn đặt vé.</p>
        </div>
      </div>

      {/* summary cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summaryLoading ? [1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl bg-slate-800/50 animate-pulse" />)
        : summary ? (
          <>
            <SummaryCard label="Tổng đơn" value={summary.total.toLocaleString()} icon={Ticket} colorCls="text-sky-400" />
            <SummaryCard label="Đã thanh toán" value={summary.paid.toLocaleString()} icon={CheckCircle2} colorCls="text-emerald-400" />
            <SummaryCard label="Chờ thanh toán" value={summary.pending.toLocaleString()} icon={Clock} colorCls="text-yellow-400" />
            <SummaryCard label="Đã hủy" value={summary.cancelled.toLocaleString()} icon={XCircle} colorCls="text-red-400" />
          </>
        ) : null}
      </div>

      {/* toolbar */}
      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl">
        <div className="flex flex-wrap gap-3 items-center">
          {/* search */}
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="search" placeholder="Tìm mã vé, tên, email…" value={inputKw}
              onChange={e => setInputKw(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 text-sm text-slate-200 outline-none focus:border-primary transition"
            />
          </div>
          {/* status */}
          <select value={filters.status} onChange={e => { setFilters(f => ({...f, status: e.target.value})); setPage(1); }}
            className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 outline-none">
            <option value="">Tất cả trạng thái</option>
            <option value="Paid">Đã thanh toán</option>
            <option value="Pending">Chờ thanh toán</option>
            <option value="Cancelled">Đã hủy</option>
            <option value="Confirmed">Đã xác nhận</option>
          </select>
          {/* from */}
          <input type="date" value={filters.fromDate}
            onChange={e => { setFilters(f => ({...f, fromDate: e.target.value})); setPage(1); }}
            className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 outline-none"
            placeholder="Từ ngày" />
          {/* to */}
          <input type="date" value={filters.toDate}
            onChange={e => { setFilters(f => ({...f, toDate: e.target.value})); setPage(1); }}
            className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 outline-none"
            placeholder="Đến ngày" />
          {/* page size */}
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 outline-none">
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s} / trang</option>)}
          </select>
          {/* reset */}
          <button onClick={resetFilters} title="Xóa bộ lọc"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-700 px-3 text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <RotateCcw className="w-4 h-4" /><span className="xl:hidden">Reset</span>
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">{result.totalItems} kết quả · Trang {page}/{Math.max(result.totalPages, 1)}</p>
      </section>

      {/* error */}
      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* table */}
      <section className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        {loading ? (
          <div className="space-y-3 p-5">{[0,1,2,3,4].map(i => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-800/70" />)}</div>
        ) : result.data.length === 0 ? (
          <div className="py-16 text-center">
            <TicketX className="mx-auto w-9 h-9 text-slate-600" />
            <p className="mt-3 font-medium text-white">Không tìm thấy đơn đặt vé nào</p>
            <p className="mt-1 text-sm text-slate-500">Thử đổi bộ lọc để xem kết quả khác.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Mã vé</th>
                  <th className="px-4 py-3">Khách hàng</th>
                  <th className="px-4 py-3">Phim</th>
                  <th className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => changeSort("bookingDate")}>
                    Ngày đặt {sortBy==="bookingDate" ? (sortOrder==="asc"?"↑":"↓") : ""}
                  </th>
                  <th className="px-4 py-3">Ghế</th>
                  <th className="px-4 py-3 cursor-pointer hover:text-white text-right" onClick={() => changeSort("totalAmount")}>
                    Tổng tiền {sortBy==="totalAmount" ? (sortOrder==="asc"?"↑":"↓") : ""}
                  </th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {result.data.map(b => (
                  <tr key={b.bookingId} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3">
                      <span className="font-mono text-primary font-bold text-xs">{b.bookingCode}</span>
                      <CopyButton text={b.bookingCode} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{b.customerName}</p>
                      <p className="text-xs text-slate-500">{b.customerEmail}</p>
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <div className="flex items-center gap-2">
                        {b.posterUrl && <img src={b.posterUrl} alt="" className="h-8 w-6 rounded object-cover shrink-0" />}
                        <span className="truncate text-slate-200">{b.movieTitle}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{b.bookingDate}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {b.seats?.slice(0,4).map((s,i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-xs text-slate-300 font-mono">{s}</span>
                        ))}
                        {b.seats?.length > 4 && <span className="text-xs text-slate-500">+{b.seats.length - 4}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-200 whitespace-nowrap">
                      {Number(b.finalAmount).toLocaleString("vi-VN")} ₫
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setDetailId(b.bookingId)}
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-primary hover:text-white transition">
                        Xem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* pagination footer */}
        {!loading && result.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
            <p className="text-xs text-slate-500">
              {Math.min((page-1)*pageSize+1, result.totalItems)}–{Math.min(page*pageSize, result.totalItems)} / {result.totalItems}
            </p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p-1)}
                className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled={page >= result.totalPages} onClick={() => setPage(p => p+1)}
                className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* detail drawer */}
      {detailId && <BookingDetailDrawer bookingId={detailId} onClose={() => setDetailId(null)} />}
    </main>
  );
}
