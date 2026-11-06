import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle, Calendar, ChevronLeft, ChevronRight, Edit2, LayoutGrid,
  List, Plus, RotateCcw, Search, Tag, Trash2, X, Zap, CheckCircle2, Clock, XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { Loading } from "../../components/Loading";
import { Title } from "../../components/admin/Title";
import { useAdminConfirm } from "../../components/admin/useAdminConfirm";

// ── helpers ────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split("T")[0];
const in30Days = () => new Date(Date.now() + 30*86400000).toISOString().split("T")[0];

function promoStatus(p) {
  const now = new Date().toISOString().split("T")[0];
  if (!p.status) return { key: "inactive", label: "Ngưng hoạt động", cls: "bg-slate-800 text-slate-400 border-slate-700" };
  if (p.startDate > now) return { key: "upcoming", label: "Sắp có hiệu lực", cls: "bg-sky-950/60 text-sky-300 border-sky-800" };
  if (p.endDate < now)   return { key: "expired",  label: "Đã hết hạn",      cls: "bg-slate-800 text-slate-400 border-slate-700" };
  return { key: "active", label: "Đang áp dụng", cls: "bg-emerald-950/60 text-emerald-300 border-emerald-800" };
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

// ── form modal ─────────────────────────────────────────────────────────────

const emptyForm = { code:"", description:"", discountPercent:10, startDate: today(), endDate: in30Days(), status:true };
const fieldCls = "mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-primary transition";

function PromotionFormModal({ editing, onClose, onSaved }) {
  const [form, setForm] = useState(editing ? {
    code: editing.code, description: editing.description || "",
    discountPercent: editing.discountPercent, startDate: editing.startDate,
    endDate: editing.endDate, status: editing.status,
  } : emptyForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => { setForm(f => ({...f, [k]: v})); setErrors(e => ({...e, [k]: ""})); };

  const validate = () => {
    const e = {};
    if (!form.code.trim()) e.code = "Mã không được để trống.";
    if (form.discountPercent < 1 || form.discountPercent > 100) e.discountPercent = "Giá trị từ 1–100%.";
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
    try {
      if (editing)
        await api.put(`/api/admin/promotions/${editing.id}`, form);
      else
        await api.post("/api/admin/promotions", form);
      toast.success(editing ? "Đã cập nhật mã khuyến mãi." : "Đã tạo mã khuyến mãi mới.");
      onSaved();
    } catch (err) {
      toast.error(err.message || "Có lỗi xảy ra.");
    } finally {
      setSaving(false);
    }
  };

  const err = (k) => errors[k] && <p className="mt-1 text-xs text-red-400">{errors[k]}</p>;

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
          {/* code */}
          <label className="block text-sm text-slate-300">
            Mã khuyến mãi *
            <input type="text" value={form.code} disabled={!!editing}
              onChange={e => set("code", e.target.value.toUpperCase())}
              placeholder="Ví dụ: ROPHIM20" className={`${fieldCls} font-mono uppercase tracking-widest`} />
            {err("code")}
          </label>

          {/* description */}
          <label className="block text-sm text-slate-300">
            Mô tả chương trình
            <input type="text" value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="Giảm 20% cho thành viên mới…" className={fieldCls} />
          </label>

          {/* discount */}
          <label className="block text-sm text-slate-300">
            Phần trăm giảm (%) *
            <input type="number" min="1" max="100" value={form.discountPercent}
              onChange={e => set("discountPercent", Number(e.target.value))} className={fieldCls} />
            {err("discountPercent")}
          </label>

          {/* dates */}
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

          {/* status */}
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

// ── promotion card (grid view) ─────────────────────────────────────────────

function PromoCard({ p, onEdit, onToggle, onDelete }) {
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
      <div className="text-2xl font-extrabold text-emerald-400 font-mono">−{p.discountPercent}%</div>
      <div className="flex items-center gap-1 text-xs text-slate-500 font-mono">
        <Calendar className="w-3 h-3 shrink-0" />
        {p.startDate} ~ {p.endDate}
      </div>
      <div className="text-xs text-slate-500">Đã dùng: <span className="font-bold text-slate-300">{p.usedCount}</span> lần</div>
      <div className="flex gap-2 mt-auto pt-2 border-t border-slate-800">
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

const emptyFilters = { keyword: "", status: "" };
const PAGE_SIZES = [12, 24, 48];

export function ManagePromotions() {
  const confirm = useAdminConfirm();
  const [summary, setSummary]     = useState(null);
  const [result, setResult]       = useState({ data: [], totalItems: 0, totalPages: 0 });
  const [filters, setFilters]     = useState(emptyFilters);
  const [inputKw, setInputKw]     = useState("");
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(12);
  const [viewMode, setViewMode]   = useState("grid"); // "grid" | "table"
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null);   // null | { mode, promo? }
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
    p.set("page", page); p.set("pageSize", pageSize);
    return p.toString();
  }, [filters, page, pageSize]);

  const loadData = useCallback(() => {
    setLoading(true);
    api.get(`/api/admin/promotions?${buildQuery()}`)
      .then(res => setResult({ data: res.data ?? [], totalItems: res.totalItems ?? 0, totalPages: res.totalPages ?? 0 }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [buildQuery]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    api.get("/api/admin/promotions/summary").then(setSummary).catch(() => {});
  }, [result]); // refresh summary after data changes

  const handleToggle = async (p) => {
    try {
      const res = await api.request(`/api/admin/promotions/${p.id}/toggle`, { method: "PATCH" });
      toast.success(res.status ? "Đã kích hoạt." : "Đã tạm dừng.");
      loadData();
    } catch (err) { toast.error(err.message || "Không thể thay đổi trạng thái."); }
  };

  const handleDelete = async (p) => {
    if (!(await confirm({
      title: "Xóa mã khuyến mãi?",
      message: `Bạn có chắc muốn xóa mã "${p.code}"?`,
      confirmLabel: "Xóa mã",
      variant: "danger",
    }))) return;
    try {
      const res = await api.delete(`/api/admin/promotions/${p.id}`);
      toast.success(res?.message || "Đã xóa.");
      loadData();
    } catch (err) { toast.error(err.message || "Không thể xóa."); }
  };

  const resetFilters = () => { setFilters(emptyFilters); setInputKw(""); setPage(1); };

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
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
        {!summary ? [1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl bg-slate-800/50 animate-pulse" />) : (
          <>
            <SummaryCard label="Tổng mã" value={summary.total} icon={Tag} colorCls="text-sky-400" />
            <SummaryCard label="Đang áp dụng" value={summary.active} icon={CheckCircle2} colorCls="text-emerald-400" />
            <SummaryCard label="Sắp có hiệu lực" value={summary.upcoming} icon={Clock} colorCls="text-yellow-400" />
            <SummaryCard label="Đã hết hạn" value={summary.expired} icon={XCircle} colorCls="text-slate-400" />
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
          <select value={filters.status} onChange={e => { setFilters(f => ({...f, status: e.target.value})); setPage(1); }}
            className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 outline-none">
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đang kích hoạt</option>
            <option value="false">Ngưng hoạt động</option>
          </select>
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 outline-none">
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s} / trang</option>)}
          </select>
          <button onClick={resetFilters} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-700 px-3 text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <RotateCcw className="w-4 h-4" />
          </button>
          {/* view toggle */}
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
              onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="min-w-[780px] w-full text-left text-sm">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Mã code</th>
                  <th className="px-4 py-3">Mô tả</th>
                  <th className="px-4 py-3 text-center">Giảm</th>
                  <th className="px-4 py-3">Thời hạn</th>
                  <th className="px-4 py-3 text-center">Đã dùng</th>
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
                      <td className="px-4 py-3 text-slate-300 max-w-[200px] truncate">{p.description || "—"}</td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-400 font-mono">−{p.discountPercent}%</td>
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono whitespace-nowrap">{p.startDate} ~ {p.endDate}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-300">{p.usedCount}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleToggle(p)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border cursor-pointer transition ${st.cls}`}>
                          {st.label}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
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

      {/* form modal */}
      {modal && (
        <PromotionFormModal
          editing={modal.mode === "edit" ? modal.promo : null}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); loadData(); }}
        />
      )}
    </main>
  );
}
