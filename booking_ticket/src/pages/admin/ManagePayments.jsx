import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, CircleDollarSign,
  Clock, CreditCard, RotateCcw, Search, X, XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { Loading } from "../../components/Loading";
import { Title } from "../../components/admin/Title";
import { useAdminConfirm } from "../../components/admin/useAdminConfirm";

// ── helpers ────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  Success:   { label: "Thành công",  cls: "bg-emerald-950/60 text-emerald-300 border-emerald-800", icon: CheckCircle2 },
  Completed: { label: "Thành công",  cls: "bg-emerald-950/60 text-emerald-300 border-emerald-800", icon: CheckCircle2 },
  Pending:   { label: "Chờ xử lý",  cls: "bg-yellow-950/60 text-yellow-300 border-yellow-800",   icon: Clock },
  Failed:    { label: "Thất bại",    cls: "bg-red-950/60 text-red-300 border-red-800",             icon: XCircle },
  PaidNeedRefund: { label: "Cần hoàn tiền", cls: "bg-orange-950/60 text-orange-300 border-orange-800", icon: AlertCircle },
};
function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? { label: status, cls: "bg-slate-800 text-slate-300 border-slate-700", icon: AlertCircle };
  const Icon = cfg.icon;
  return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}><Icon className="w-3 h-3"/>{cfg.label}</span>;
}

function SummaryCard({ label, value, sub, icon: Icon, colorCls }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/80 border border-slate-800">
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="mt-1 text-2xl font-bold text-white">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      <div className={`p-3 rounded-xl bg-slate-800/60 border border-slate-700 ${colorCls}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}

// ── detail drawer ──────────────────────────────────────────────────────────

function PaymentDetailDrawer({ paymentId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/admin/payments/${paymentId}`)
      .then(setDetail)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [paymentId]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <aside className="flex h-full w-full max-w-md flex-col border-l border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Chi tiết giao dịch</p>
            <h2 className="mt-1 text-xl font-semibold text-white">#{paymentId}</h2>
          </div>
          <button onClick={onClose} className="rounded-xl border border-slate-700 p-2 text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading && <Loading />}
          {detail && (
            <>
              {/* amount block */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Số tiền</p>
                <p className="mt-1 text-3xl font-extrabold text-primary">{Number(detail.amount).toLocaleString("vi-VN")} ₫</p>
                <div className="mt-2 flex justify-center gap-2 flex-wrap">
                  <StatusBadge status={detail.status} />
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300 border border-slate-700">
                    <CreditCard className="w-3 h-3" />{detail.method}
                  </span>
                </div>
              </div>

              {/* transaction info */}
              <section>
                <h3 className="mb-3 text-sm font-semibold text-white">Thông tin giao dịch</h3>
                <div className="grid grid-cols-1 gap-3">
                  <InfoRow label="Mã giao dịch" value={<span className="font-mono text-xs">{detail.transactionCode || "---"}</span>} />
                  <InfoRow label="Thời gian thanh toán" value={detail.paidAt || "---"} />
                </div>
              </section>

              <hr className="border-slate-800" />

              {/* booking info */}
              <section>
                <h3 className="mb-3 text-sm font-semibold text-white">Đơn đặt vé liên quan</h3>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="Mã vé" value={<span className="font-mono text-primary font-bold">{detail.bookingCode}</span>} />
                  <InfoRow label="Trạng thái booking" value={detail.bookingStatus} />
                  <InfoRow label="Khách hàng" value={detail.customerName} />
                  <InfoRow label="Email" value={detail.customerEmail} />
                  <InfoRow label="Phim" value={detail.movieTitle} span2 />
                  <InfoRow label="Suất chiếu" value={`${detail.showDate} · ${detail.startTime}`} />
                  <InfoRow label="Rạp" value={detail.cinemaName} />
                </div>
              </section>

              {detail.seats?.length > 0 && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-white">Ghế</h3>
                  <div className="flex flex-wrap gap-2">
                    {detail.seats.map((s,i) => <span key={i} className="px-2 py-1 rounded bg-slate-800 text-xs text-slate-300 font-mono border border-slate-700">{s}</span>)}
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

function InfoRow({ label, value, span2 }) {
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-950/60 p-3 ${span2 ? "col-span-2" : ""}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-medium text-slate-100 break-words">{value || "—"}</div>
    </div>
  );
}

// ── quick filter tabs ──────────────────────────────────────────────────────

const QUICK_TABS = [
  { key: "",          label: "Tất cả" },
  { key: "Success",   label: "Thành công" },
  { key: "Completed", label: "Thành công (cũ)" },
  { key: "Pending",   label: "Chờ xử lý" },
  { key: "Failed",    label: "Thất bại" },
];

// ── main page ──────────────────────────────────────────────────────────────

const emptyFilters = { keyword: "", status: "", method: "", fromDate: "", toDate: "" };
const PAGE_SIZES = [10, 20, 50];

export function ManagePayments() {
  const confirm = useAdminConfirm();
  const [summary, setSummary]     = useState(null);
  const [result, setResult]       = useState({ data: [], totalItems: 0, totalPages: 0 });
  const [filters, setFilters]     = useState(emptyFilters);
  const [inputKw, setInputKw]     = useState("");
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(15);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [detailId, setDetailId]   = useState(null);
  const debounceRef = useRef(null);

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
    if (filters.method)   p.set("method",   filters.method);
    if (filters.fromDate) p.set("fromDate", filters.fromDate);
    if (filters.toDate)   p.set("toDate",   filters.toDate);
    p.set("page", page); p.set("pageSize", pageSize);
    return p.toString();
  }, [filters, page, pageSize]);

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    api.get(`/api/admin/payments?${buildQuery()}`)
      .then(res => { if (active) setResult({ data: res.data ?? [], totalItems: res.totalItems ?? 0, totalPages: res.totalPages ?? 0 }); })
      .catch(err => { if (active) setError(err.message || "Không thể tải dữ liệu."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [buildQuery]);

  useEffect(() => {
    const sp = new URLSearchParams();
    if (filters.method)   sp.set("method",   filters.method);
    if (filters.fromDate) sp.set("fromDate", filters.fromDate);
    if (filters.toDate)   sp.set("toDate",   filters.toDate);
    api.get(`/api/admin/payments/summary?${sp.toString()}`)
      .then(setSummary).catch(() => {});
  }, [filters.method, filters.fromDate, filters.toDate]);

  const resetFilters = () => { setFilters(emptyFilters); setInputKw(""); setPage(1); };

  const handleVerify = async (p) => {
    if (!(await confirm({
      title: "Xác nhận thanh toán?",
      message: `Xác nhận thanh toán thủ công cho giao dịch #${p.id}?`,
      confirmLabel: "Xác nhận thanh toán",
      variant: "primary",
    }))) return;
    try {
      await api.post(`/api/admin/payments/${p.id}/verify`, {});
      toast.success("Đã xác nhận thanh toán!");
      setResult(r => ({ ...r, data: r.data.map(x => x.id === p.id ? {...x, status: "Completed"} : x) }));
    } catch (err) {
      toast.error(err.message || "Không thể xác nhận.");
    }
  };

  return (
    <main className="max-w-[1400px] pb-10 text-slate-100">
      <div className="flex flex-col gap-1 mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Quản trị tài chính</p>
        <Title text1="Quản Lý" text2="Thanh Toán & Giao Dịch" />
        <p className="text-sm text-slate-500">Theo dõi giao dịch, trạng thái và đối soát thanh toán.</p>
      </div>

      {/* summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
        {!summary ? [1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl bg-slate-800/50 animate-pulse" />) : (
          <>
            <SummaryCard label="Tổng giao dịch" value={summary.total.toLocaleString()} icon={CreditCard} colorCls="text-sky-400" />
            <SummaryCard label="Doanh thu" value={Number(summary.totalRevenue).toLocaleString("vi-VN") + " ₫"} sub="Chỉ tính GD thành công" icon={CircleDollarSign} colorCls="text-emerald-400" />
            <SummaryCard label="Chờ xử lý" value={summary.pending.toLocaleString()} icon={Clock} colorCls="text-yellow-400" />
            <SummaryCard label="Thất bại" value={summary.failed.toLocaleString()} icon={XCircle} colorCls="text-red-400" />
          </>
        )}
      </div>

      {/* quick tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {QUICK_TABS.map(tab => (
          <button key={tab.key}
            onClick={() => { setFilters(f => ({...f, status: tab.key})); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              filters.status === tab.key
                ? "bg-primary text-white border-primary"
                : "border-slate-700 text-slate-400 hover:text-white hover:border-slate-500"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* toolbar */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input type="search" value={inputKw} onChange={e => setInputKw(e.target.value)}
              placeholder="Mã GD, mã vé, khách hàng…"
              className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 text-sm text-slate-200 outline-none focus:border-primary" />
          </div>
          <select value={filters.method} onChange={e => { setFilters(f => ({...f, method: e.target.value})); setPage(1); }}
            className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 outline-none">
            <option value="">Tất cả phương thức</option>
            <option value="SePay">SePay</option>
            <option value="VNPAY">VNPAY</option>
            <option value="Cash">Tiền mặt</option>
          </select>
          <input type="date" value={filters.fromDate} onChange={e => { setFilters(f => ({...f, fromDate: e.target.value})); setPage(1); }}
            className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 outline-none" />
          <input type="date" value={filters.toDate} onChange={e => { setFilters(f => ({...f, toDate: e.target.value})); setPage(1); }}
            className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 outline-none" />
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 outline-none">
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s} / trang</option>)}
          </select>
          <button onClick={resetFilters} title="Xóa bộ lọc"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-700 px-3 text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">{result.totalItems} kết quả · Trang {page}/{Math.max(result.totalPages, 1)}</p>
      </section>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* table */}
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        {loading ? (
          <div className="space-y-3 p-5">{[0,1,2,3,4].map(i => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-800/70" />)}</div>
        ) : result.data.length === 0 ? (
          <div className="py-16 text-center">
            <CreditCard className="mx-auto w-9 h-9 text-slate-600" />
            <p className="mt-3 font-medium text-white">Không tìm thấy giao dịch nào</p>
            <p className="mt-1 text-sm text-slate-500">Thử đổi bộ lọc.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[860px] w-full text-left text-sm">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Mã GD</th>
                  <th className="px-4 py-3">Mã vé</th>
                  <th className="px-4 py-3">Khách hàng</th>
                  <th className="px-4 py-3">Phim</th>
                  <th className="px-4 py-3">Phương thức</th>
                  <th className="px-4 py-3 text-right">Số tiền</th>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {result.data.map(p => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.transactionCode || "---"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-primary font-bold">{p.bookingCode}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{p.customerName}</p>
                      <p className="text-xs text-slate-500">{p.customerEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300 max-w-[150px] truncate">{p.movieTitle}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-lg text-xs bg-slate-800 border border-slate-700 text-slate-200">{p.method}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-200 whitespace-nowrap font-mono">
                      {Number(p.amount).toLocaleString("vi-VN")} ₫
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{p.paidAt || "---"}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setDetailId(p.id)}
                          className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:border-primary hover:text-white transition">
                          Chi tiết
                        </button>
                        {p.status === "Pending" && (
                          <button onClick={() => handleVerify(p)}
                            className="rounded-lg border border-emerald-700 bg-emerald-950/40 px-2.5 py-1.5 text-xs text-emerald-300 hover:bg-emerald-900/60 transition">
                            Xác nhận
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && result.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
            <p className="text-xs text-slate-500">
              {Math.min((page-1)*pageSize+1, result.totalItems)}–{Math.min(page*pageSize, result.totalItems)} / {result.totalItems}
            </p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p-1)}
                className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled={page >= result.totalPages} onClick={() => setPage(p => p+1)}
                className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {detailId && <PaymentDetailDrawer paymentId={detailId} onClose={() => setDetailId(null)} />}
    </main>
  );
}
