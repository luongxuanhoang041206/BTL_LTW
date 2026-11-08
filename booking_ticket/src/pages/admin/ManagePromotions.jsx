import { useCallback, useEffect, useRef, useState } from "react";
import {
  Calendar, ChevronLeft, ChevronRight, Edit2, Eye, LayoutGrid,
  List, Plus, RotateCcw, Search, Tag, Trash2, X, Zap, CheckCircle2, Clock, XCircle,
  Users, BadgePercent,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { formatVnd, scopeLabel } from "../../lib/promotionApi";
import { Loading } from "../../components/Loading";
import { Title } from "../../components/admin/Title";
import { useAdminConfirm } from "../../components/admin/useAdminConfirm";

// ── helpers ───────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split("T")[0];
const in30Days = () => new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

function promoStatus(p) {
  const now = new Date().toISOString().split("T")[0];
  if (!p.status) return { key: "inactive", label: "Ngưng hoạt động", cls: "bg-slate-800 text-slate-400 border-slate-700" };
  if (p.startDate > now) return { key: "upcoming", label: "Sắp có hiệu lực", cls: "bg-sky-950/60 text-sky-300 border-sky-800" };
  if (p.endDate < now)   return { key: "expired",  label: "Đã hết hạn",      cls: "bg-slate-800 text-slate-400 border-slate-700" };
  return { key: "active", label: "Đang áp dụng", cls: "bg-emerald-950/60 text-emerald-300 border-emerald-800" };
}

const valueLabel = (p) => p.discountType === "fixed"
  ? `−${formatVnd(p.discountValue)}`
  : `−${Number(p.discountValue)}%`;

const usageLabel = (p) => p.usageLimit == null
  ? `${p.usedCount}`
  : `${p.usedCount}/${p.usageLimit}`;

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

// ── form modal ─────────────────────────────────────────────────────────────

const emptyForm = {
  code:"", description:"", discountType:"percent", discountValue:10, promotionScope:"all",
  minOrderAmount:0, maxDiscountAmount:"", usageLimit:"", usageLimitPerUser:"",
  startDate: today(), endDate: in30Days(), status:true,
};
const fieldCls = "mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-primary transition";

function PromotionFormModal({ editing, onClose, onSaved }) {
  const [form, setForm] = useState(editing ? {
    code: editing.code, description: editing.description || "",
    discountType: editing.discountType, discountValue: editing.discountValue,
    promotionScope: editing.promotionScope, minOrderAmount: editing.minOrderAmount,
    maxDiscountAmount: editing.maxDiscountAmount ?? "", usageLimit: editing.usageLimit ?? "",
    usageLimitPerUser: editing.usageLimitPerUser ?? "",
    startDate: editing.startDate, endDate: editing.endDate, status: editing.status,
  } : emptyForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => { setForm(f => ({...f, [k]: v})); setErrors(e => ({...e, [k]: ""})); };

  const validate = () => {
    const e = {};
    if (!form.code.trim()) e.code = "Mã không được để trống.";
    else if (form.code.trim().length > 30) e.code = "Mã tối đa 30 ký tự.";
    const val = Number(form.discountValue);
    if (!(val > 0)) e.discountValue = "Giá trị giảm phải lớn hơn 0.";
    else if (form.discountType === "percent" && val > 100) e.discountValue = "Giảm phần trăm không quá 100.";
    if (Number(form.minOrderAmount) < 0) e.minOrderAmount = "Đơn tối thiểu không được âm.";
    if (form.maxDiscountAmount !== "" && !(Number(form.maxDiscountAmount) > 0)) e.maxDiscountAmount = "Mức giảm tối đa phải lớn hơn 0.";
    if (form.usageLimit !== "" && !(Number(form.usageLimit) > 0)) e.usageLimit = "Giới hạn lượt phải lớn hơn 0.";
    if (form.usageLimitPerUser !== "" && !(Number(form.usageLimitPerUser) > 0)) e.usageLimitPerUser = "Giới hạn mỗi người phải lớn hơn 0.";
    if (!form.startDate) e.startDate = "Chọn ngày bắt đầu.";
    if (!form.endDate)   e.endDate   = "Chọn ngày kết thúc.";
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      e.endDate = "Ngày kết thúc phải sau ngày bắt đầu.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate() || saving) return;
    setSaving(true);
    const payload = {
      code: form.code.trim(),
      description: form.description,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      promotionScope: form.promotionScope,
      minOrderAmount: Number(form.minOrderAmount) || 0,
      maxDiscountAmount: form.maxDiscountAmount === "" ? null : Number(form.maxDiscountAmount),
      usageLimit: form.usageLimit === "" ? null : Number(form.usageLimit),
      usageLimitPerUser: form.usageLimitPerUser === "" ? null : Number(form.usageLimitPerUser),
      startDate: form.startDate,
      endDate: form.endDate,
      status: form.status,
    };
    try {
      if (editing)
        await api.put(`/api/admin/promotions/${editing.id}`, payload);
      else
        await api.post("/api/admin/promotions", payload);
      toast.success(editing ? "Đã cập nhật mã khuyến mãi." : "Đã tạo mã khuyến mãi mới.");
      onSaved();
    } catch (err) {
      toast.error(err.message || "Có lỗi xảy ra.");
    } finally {
      setSaving(false);
    }
  };

  const err = (k) => errors[k] && <p className="mt-1 text-xs text-red-400">{errors[k]}</p>;
  const isPercent = form.discountType === "percent";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm p-0 sm:items-center sm:p-5"
      onMouseDown={e => e.target === e.currentTarget && !saving && onClose()}>
      <section className="w-full max-w-lg rounded-t-3xl border border-slate-700 bg-slate-900 shadow-2xl sm:rounded-3xl max-h-[90vh] overflow-y-auto">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Khuyến mãi</p>
            <h2 className="mt-1 text-lg font-semibold text-white">{editing ? "Chỉnh sửa mã khuyến mãi" : "Tạo mã khuyến mãi mới"}</h2>
          </div>
          <button disabled={saving} onClick={onClose} className="rounded-xl border border-slate-700 p-2 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50">
            <X className="w-4 h-4" />
          </button>
        </header>

        <form onSubmit={submit} className="p-5 space-y-4">
          <label className="block text-sm text-slate-300">
            Mã khuyến mãi *
            <input type="text" value={form.code} disabled={!!editing}
              onChange={e => set("code", e.target.value.toUpperCase())}
              placeholder="Ví dụ: ROPHIM20" className={`${fieldCls} font-mono uppercase tracking-widest`} />
            {err("code")}
          </label>

          <label className="block text-sm text-slate-300">
            Mô tả chương trình
            <input type="text" value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="Giảm 20% cho thành viên mới…" className={fieldCls} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm text-slate-300">
              Loại giảm giá *
              <select value={form.discountType} onChange={e => set("discountType", e.target.value)} className={fieldCls}>
                <option value="percent">Phần trăm (%)</option>
                <option value="fixed">Số tiền cố định (₫)</option>
              </select>
            </label>
            <label className="block text-sm text-slate-300">
              {isPercent ? "Giá trị giảm (%) *" : "Giá trị giảm (₫) *"}
              <input type="number" min="1" max={isPercent ? 100 : undefined} value={form.discountValue}
                onChange={e => set("discountValue", e.target.value)} className={fieldCls} />
              {err("discountValue")}
            </label>
          </div>

          <label className="block text-sm text-slate-300">
            Phạm vi áp dụng *
            <select value={form.promotionScope} onChange={e => set("promotionScope", e.target.value)} className={fieldCls}>
              <option value="all">Toàn bộ đơn (vé + đồ ăn + combo)</option>
              <option value="tickets">Chỉ tiền vé</option>
              <option value="foods">Chỉ đồ ăn / bắp nước</option>
              <option value="combos">Chỉ combo</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm text-slate-300">
              Đơn tối thiểu (₫)
              <input type="number" min="0" value={form.minOrderAmount}
                onChange={e => set("minOrderAmount", e.target.value)} className={fieldCls} />
              {err("minOrderAmount")}
            </label>
            <label className="block text-sm text-slate-300">
              Giảm tối đa (₫)
              <input type="number" min="1" value={form.maxDiscountAmount} placeholder="Không giới hạn"
                onChange={e => set("maxDiscountAmount", e.target.value)} className={fieldCls} />
              {err("maxDiscountAmount")}
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm text-slate-300">
              Tổng lượt dùng
              <input type="number" min="1" value={form.usageLimit} placeholder="Không giới hạn"
                onChange={e => set("usageLimit", e.target.value)} className={fieldCls} />
              {err("usageLimit")}
            </label>
            <label className="block text-sm text-slate-300">
              Lượt / người
              <input type="number" min="1" value={form.usageLimitPerUser} placeholder="Không giới hạn"
                onChange={e => set("usageLimitPerUser", e.target.value)} className={fieldCls} />
              {err("usageLimitPerUser")}
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm text-slate-300">
              Ngày bắt đầu *
              <input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} className={fieldCls} />
              {err("startDate")}
            </label>
            <label className="block text-sm text-slate-300">
              Ngày kết thúc *
              <input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} className={fieldCls} />
              {err("endDate")}
            </label>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.status} onChange={e => set("status", e.target.checked)}
              className="w-4 h-4 rounded accent-primary" />
            <span className="text-sm text-slate-300">Kích hoạt ngay sau khi lưu</span>
          </label>

          <footer className="flex justify-end gap-3 pt-2 border-t border-slate-800">
            <button type="button" disabled={saving} onClick={onClose}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:bg-slate-800 disabled:opacity-50">
              Hủy
            </button>
            <button type="submit" disabled={saving}
              className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
              {saving ? "Đang lưu…" : editing ? "Cập nhật" : "Tạo mã"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

// ── detail modal (stats + history) ─────────────────────────────────────────

const redemptionStatus = (s) => ({
  Redeemed: { label: "Đã dùng", cls: "bg-emerald-950/60 text-emerald-300 border-emerald-800" },
  Reserved: { label: "Đang giữ", cls: "bg-amber-950/60 text-amber-300 border-amber-800" },
  Released: { label: "Đã nhả", cls: "bg-slate-800 text-slate-400 border-slate-700" },
}[s] || { label: s, cls: "bg-slate-800 text-slate-400 border-slate-700" });

function PromotionDetailModal({ id, onClose, onEdit }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get(`/api/admin/promotions/${id}`)
      .then(res => { if (active) setDetail(res); })
      .catch(err => { if (active) setError(err.message || "Không thể tải chi tiết."); });
    return () => { active = false; };
  }, [id]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm p-0 sm:items-center sm:p-5"
      onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className="w-full max-w-3xl rounded-t-3xl border border-slate-700 bg-slate-900 shadow-2xl sm:rounded-3xl max-h-[90vh] overflow-y-auto">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Chi tiết khuyến mãi</p>
            <h2 className="mt-1 font-mono text-lg font-semibold text-white">{detail?.code || "…"}</h2>
          </div>
          <div className="flex gap-2">
            {detail && (
              <button onClick={() => onEdit(detail)} className="rounded-xl border border-slate-700 p-2 text-slate-400 hover:text-white hover:bg-slate-800">
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="rounded-xl border border-slate-700 p-2 text-slate-400 hover:text-white hover:bg-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {!detail && !error && <div className="p-10"><Loading /></div>}
        {error && <p className="p-6 text-sm text-red-400">{error}</p>}

        {detail && (
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <SummaryCard label="Đã dùng" value={detail.totalUsed} icon={CheckCircle2} colorCls="text-emerald-400" />
              <SummaryCard label="Đang giữ" value={detail.held} icon={Clock} colorCls="text-amber-400" />
              <SummaryCard label="Còn lại" value={detail.remainingUses == null ? "∞" : detail.remainingUses} icon={Tag} colorCls="text-sky-400" />
              <SummaryCard label="Tổng giảm" value={formatVnd(detail.totalDiscountAmount)} icon={BadgePercent} colorCls="text-primary" />
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-sm space-y-1">
              <p className="text-slate-300">{detail.description || "—"}</p>
              <p className="text-slate-400">
                <span className="font-bold text-emerald-400">{valueLabel(detail)}</span>
                {" · "}{scopeLabel(detail.promotionScope)}
                {Number(detail.minOrderAmount) > 0 && ` · Đơn tối thiểu ${formatVnd(detail.minOrderAmount)}`}
                {detail.maxDiscountAmount != null && ` · Giảm tối đa ${formatVnd(detail.maxDiscountAmount)}`}
              </p>
              <p className="text-xs text-slate-500 font-mono">{detail.startDate} ~ {detail.endDate}
                {detail.usageLimit != null && ` · Giới hạn ${detail.usageLimit} lượt`}
                {detail.usageLimitPerUser != null && ` · ${detail.usageLimitPerUser} lượt/người`}
              </p>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-white">Lịch sử giữ / sử dụng</h3>
              {detail.history.length === 0 ? (
                <p className="text-sm text-slate-500">Chưa có lượt sử dụng nào.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="min-w-[640px] w-full text-left text-sm">
                    <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Booking</th>
                        <th className="px-3 py-2">Khách hàng</th>
                        <th className="px-3 py-2">Trạng thái</th>
                        <th className="px-3 py-2 text-right">Giảm</th>
                        <th className="px-3 py-2">Thời gian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {detail.history.map(h => {
                        const st = redemptionStatus(h.status);
                        const time = h.redeemedAt || h.releasedAt || h.reservedAt;
                        return (
                          <tr key={h.redemptionId}>
                            <td className="px-3 py-2 font-mono text-xs text-slate-300">{h.bookingCode}</td>
                            <td className="px-3 py-2 text-slate-300">
                              <p className="truncate max-w-[160px]">{h.userName}</p>
                              <p className="text-xs text-slate-500 truncate max-w-[160px]">{h.userEmail}</p>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${st.cls}`}>{st.label}</span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-emerald-400">
                              {h.status === "Redeemed" ? formatVnd(h.discountAmount) : "—"}
                            </td>
                            <td className="px-3 py-2 text-xs text-slate-400 font-mono whitespace-nowrap">
                              {new Date(time).toLocaleString("vi-VN")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ── promotion card (grid view) ─────────────────────────────────────────────

function PromoCard({ p, onEdit, onToggle, onDelete, onDetail }) {
  const st = promoStatus(p);
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col gap-3 hover:border-slate-700 transition">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400 shrink-0" />
          <span className="font-mono font-bold text-primary text-base bg-primary/10 border border-primary/30 px-2 py-0.5 rounded-lg">
            {p.code}
          </span>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${st.cls}`}>
          {st.label}
        </span>
      </div>
      <p className="text-sm text-slate-400 line-clamp-2 min-h-[2.5rem]">{p.description || "—"}</p>
      <div className="text-2xl font-extrabold text-emerald-400 font-mono">{valueLabel(p)}</div>
      <p className="text-xs text-slate-500">{scopeLabel(p.promotionScope)}
        {Number(p.minOrderAmount) > 0 && ` · Đơn ≥ ${formatVnd(p.minOrderAmount)}`}
      </p>
      <div className="flex items-center gap-1 text-xs text-slate-500 font-mono">
        <Calendar className="w-3 h-3 shrink-0" />
        {p.startDate} ~ {p.endDate}
      </div>
      <div className="text-xs text-slate-500">
        Đã dùng: <span className="font-bold text-slate-300">{usageLabel(p)}</span>
        {p.heldCount > 0 && <span className="ml-2 text-amber-300">· giữ {p.heldCount}</span>}
      </div>
      <div className="flex gap-2 mt-auto pt-2 border-t border-slate-800">
        <button onClick={() => onDetail(p)} title="Chi tiết"
          className="rounded-lg border border-slate-700 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800">
          <Eye className="w-4 h-4" />
        </button>
        <button onClick={() => onToggle(p)} title={p.status ? "Tạm dừng" : "Kích hoạt"}
          className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
            p.status ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-emerald-700 text-emerald-300 hover:bg-emerald-950/40"
          }`}>
          {p.status ? "Tạm dừng" : "Kích hoạt"}
        </button>
        <button onClick={() => onEdit(p)} title="Sửa"
          className="rounded-lg border border-slate-700 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800">
          <Edit2 className="w-4 h-4" />
        </button>
        <button onClick={() => onDelete(p)} title="Xóa"
          className="rounded-lg border border-red-900/50 p-1.5 text-red-400 hover:bg-red-950/40">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </article>
  );
}

// ── main page ──────────────────────────────────────────────────────────────

const emptyFilters = { keyword: "", status: "", discountType: "", promotionScope: "" };
const PAGE_SIZES = [12, 24, 48];

export function ManagePromotions() {
  const confirm = useAdminConfirm();
  const [summary, setSummary]     = useState(null);
  const [result, setResult]       = useState({ data: [], totalItems: 0, totalPages: 0 });
  const [filters, setFilters]     = useState(emptyFilters);
  const [inputKw, setInputKw]     = useState("");
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(12);
  const [viewMode, setViewMode]   = useState("grid");
  const [loading, setLoading]     = useState(true);
  const [reload, setReload]       = useState(0);
  const [modal, setModal]         = useState(null);   // null | { mode, promo? }
  const [detailId, setDetailId]   = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilters(f => ({ ...f, keyword: inputKw.trim() })); setPage(1);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [inputKw]);

  const buildQuery = useCallback(() => {
    const p = new URLSearchParams();
    if (filters.keyword) p.set("keyword", filters.keyword);
    if (filters.status === "true")  p.set("status", "true");
    if (filters.status === "false") p.set("status", "false");
    if (filters.discountType)   p.set("discountType", filters.discountType);
    if (filters.promotionScope) p.set("promotionScope", filters.promotionScope);
    p.set("page", page); p.set("pageSize", pageSize);
    return p.toString();
  }, [filters, page, pageSize]);

  useEffect(() => {
    let active = true;
    api.get(`/api/admin/promotions?${buildQuery()}`)
      .then(res => { if (active) setResult({ data: res.data ?? [], totalItems: res.totalItems ?? 0, totalPages: res.totalPages ?? 0 }); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [buildQuery, reload]);

  useEffect(() => {
    let active = true;
    api.get("/api/admin/promotions/summary")
      .then(res => { if (active) setSummary(res); })
      .catch(() => {});
    return () => { active = false; };
  }, [result, reload]);

  const refresh = () => { setLoading(true); setReload(r => r+1); };
  const changeFilter = (k, v) => { setFilters(f => ({...f, [k]: v})); setPage(1); setLoading(true); };

  const handleToggle = async (p) => {
    try {
      const res = await api.request(`/api/admin/promotions/${p.id}/toggle`, { method: "PATCH" });
      toast.success(res.status ? "Đã kích hoạt." : "Đã tạm dừng.");
      refresh();
    } catch (err) { toast.error(err.message || "Không thể thay đổi trạng thái."); }
  };

  const handleDelete = async (p) => {
    if (!(await confirm({
      title: "Xóa mã khuyến mãi?",
      message: `Bạn có chắc muốn xóa mã "${p.code}"? Mã đã có lượt dùng sẽ được chuyển sang ngưng hoạt động.`,
      confirmLabel: "Xóa mã",
      variant: "danger",
    }))) return;
    try {
      const res = await api.delete(`/api/admin/promotions/${p.id}`);
      toast.success(res?.message || "Đã xóa.");
      refresh();
    } catch (err) { toast.error(err.message || "Không thể xóa."); }
  };

  const resetFilters = () => { setFilters(emptyFilters); setInputKw(""); setPage(1); setLoading(true); };

  return (
    <main className="max-w-[1400px] pb-10 text-slate-100">
      <div className="flex flex-col gap-1 xl:flex-row xl:items-end xl:justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Quản trị marketing</p>
          <Title text1="Quản Lý" text2="Mã Khuyến Mãi" />
          <p className="text-sm text-slate-500 mt-1">Tạo, chỉnh sửa và theo dõi mã giảm giá.</p>
        </div>
        <button onClick={() => setModal({ mode: "create" })}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-lg hover:bg-primary/90 transition">
          <Plus className="w-4 h-4" /> Tạo mã khuyến mãi
        </button>
      </div>

      {/* summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6 mb-6">
        {!summary ? [1,2,3,4,5,6].map(i => <div key={i} className="h-24 rounded-xl bg-slate-800/50 animate-pulse" />) : (
          <>
            <SummaryCard label="Tổng mã" value={summary.total} icon={Tag} colorCls="text-sky-400" />
            <SummaryCard label="Đang áp dụng" value={summary.active} icon={CheckCircle2} colorCls="text-emerald-400" />
            <SummaryCard label="Sắp hiệu lực" value={summary.upcoming} icon={Clock} colorCls="text-yellow-400" />
            <SummaryCard label="Đã hết hạn" value={summary.expired} icon={XCircle} colorCls="text-slate-400" />
            <SummaryCard label="Lượt đã dùng" value={summary.totalRedeemed} icon={Users} colorCls="text-emerald-400" />
            <SummaryCard label="Tổng tiền giảm" value={formatVnd(summary.totalDiscountAmount)} icon={BadgePercent} colorCls="text-primary" />
          </>
        )}
      </div>

      {/* toolbar */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 mb-5">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input type="search" value={inputKw} onChange={e => setInputKw(e.target.value)}
              placeholder="Tìm mã, mô tả…"
              className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 text-sm text-slate-200 outline-none focus:border-primary" />
          </div>
          <select value={filters.status} onChange={e => changeFilter("status", e.target.value)}
            className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 outline-none">
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đang kích hoạt</option>
            <option value="false">Ngưng hoạt động</option>
          </select>
          <select value={filters.discountType} onChange={e => changeFilter("discountType", e.target.value)}
            className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 outline-none">
            <option value="">Tất cả loại</option>
            <option value="percent">Phần trăm</option>
            <option value="fixed">Số tiền</option>
          </select>
          <select value={filters.promotionScope} onChange={e => changeFilter("promotionScope", e.target.value)}
            className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 outline-none">
            <option value="">Tất cả phạm vi</option>
            <option value="all">Toàn bộ đơn</option>
            <option value="tickets">Tiền vé</option>
            <option value="foods">Đồ ăn</option>
            <option value="combos">Combo</option>
          </select>
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); setLoading(true); }}
            className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 outline-none">
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s} / trang</option>)}
          </select>
          <button onClick={resetFilters} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-700 px-3 text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="flex rounded-xl border border-slate-700 bg-slate-950 p-1 ml-auto">
            <button onClick={() => setViewMode("grid")} className={`flex items-center gap-1.5 rounded-lg px-3 h-8 text-xs font-medium transition ${viewMode === "grid" ? "bg-primary/15 text-primary" : "text-slate-400 hover:text-white"}`}>
              <LayoutGrid className="w-3.5 h-3.5" /> Grid
            </button>
            <button onClick={() => setViewMode("table")} className={`flex items-center gap-1.5 rounded-lg px-3 h-8 text-xs font-medium transition ${viewMode === "table" ? "bg-primary/15 text-primary" : "text-slate-400 hover:text-white"}`}>
              <List className="w-3.5 h-3.5" /> Bảng
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">{result.totalItems} mã · Trang {page}/{Math.max(result.totalPages, 1)}</p>
      </section>

      {/* content */}
      {loading ? (
        <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-3"}>
          {[0,1,2,3,4,5].map(i => <div key={i} className="h-52 animate-pulse rounded-2xl bg-slate-800/50" />)}
        </div>
      ) : result.data.length === 0 ? (
        <div className="py-20 text-center">
          <Tag className="mx-auto w-10 h-10 text-slate-600" />
          <p className="mt-3 font-medium text-white">Chưa có mã khuyến mãi nào</p>
          <p className="mt-1 text-sm text-slate-500">Tạo mã mới để bắt đầu.</p>
          <button onClick={() => setModal({ mode: "create" })}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90">
            <Plus className="w-4 h-4" /> Tạo mã đầu tiên
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {result.data.map(p => (
            <PromoCard key={p.id} p={p}
              onEdit={p => setModal({ mode: "edit", promo: p })}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onDetail={p => setDetailId(p.id)} />
          ))}
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Mã code</th>
                  <th className="px-4 py-3">Mô tả</th>
                  <th className="px-4 py-3 text-center">Giảm</th>
                  <th className="px-4 py-3">Phạm vi</th>
                  <th className="px-4 py-3 text-right">Đơn tối thiểu</th>
                  <th className="px-4 py-3 text-center">Đã dùng</th>
                  <th className="px-4 py-3">Thời hạn</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {result.data.map(p => {
                  const st = promoStatus(p);
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-primary bg-primary/10 border border-primary/30 px-2 py-0.5 rounded-lg text-xs">
                          {p.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 max-w-[180px] truncate">{p.description || "—"}</td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-400 font-mono whitespace-nowrap">{valueLabel(p)}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{scopeLabel(p.promotionScope)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-slate-400">{Number(p.minOrderAmount) > 0 ? formatVnd(p.minOrderAmount) : "—"}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-300">{usageLabel(p)}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono whitespace-nowrap">{p.startDate} ~ {p.endDate}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleToggle(p)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border cursor-pointer transition ${st.cls}`}>
                          {st.label}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setDetailId(p.id)}
                            className="rounded-lg border border-slate-700 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => setModal({ mode: "edit", promo: p })}
                            className="rounded-lg border border-slate-700 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(p)}
                            className="rounded-lg border border-red-900/50 p-1.5 text-red-400 hover:bg-red-950/40">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* pagination */}
      {!loading && result.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-slate-500">
            {Math.min((page-1)*pageSize+1, result.totalItems)}–{Math.min(page*pageSize, result.totalItems)} / {result.totalItems}
          </p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => { setPage(p => p-1); setLoading(true); }}
              className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button disabled={page >= result.totalPages} onClick={() => { setPage(p => p+1); setLoading(true); }}
              className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* form modal */}
      {modal && (
        <PromotionFormModal
          editing={modal.mode === "edit" ? modal.promo : null}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); refresh(); }}
        />
      )}

      {/* detail modal */}
      {detailId != null && (
        <PromotionDetailModal
          id={detailId}
          onClose={() => setDetailId(null)}
          onEdit={(d) => { setDetailId(null); setModal({ mode: "edit", promo: d }); }}
        />
      )}
    </main>
  );
}