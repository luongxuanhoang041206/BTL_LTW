import { useEffect, useState } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  Film,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Link } from "react-router";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { getAdminCinemas } from "../../lib/cinemaApi";
import { Title } from "../../components/admin/Title";
import { useAdminConfirm } from "../../components/admin/useAdminConfirm";

const EMPTY_FILTERS = { keyword: "", city: "", status: "" };

export function ManageCinemas() {
  const confirm = useAdminConfirm();
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCinema, setEditingCinema] = useState(null);
  const [form, setForm] = useState({ name: "", address: "", city: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchCinemas = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await getAdminCinemas({ ...filters, page, pageSize });
        if (!active) return;

        setCinemas(Array.isArray(response?.data) ? response.data : []);
        setTotalItems(Number(response?.totalItems) || 0);
        setTotalPages(Number(response?.totalPages) || 0);
      } catch (err) {
        if (!active) return;
        setCinemas([]);
        setTotalItems(0);
        setTotalPages(0);
        setError(err.message || "Không thể tải danh sách rạp.");
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchCinemas();
    return () => {
      active = false;
    };
  }, [filters, page, pageSize, reloadKey]);

  const activeFilters = Object.entries(filters).filter(([, value]) => value.trim());

  const openAdd = () => {
    setEditingCinema(null);
    setForm({ name: "", address: "", city: "", phone: "" });
    setModalOpen(true);
  };

  const openEdit = (cinema) => {
    setEditingCinema(cinema);
    setForm({
      name: cinema.name || "",
      address: cinema.address || "",
      city: cinema.city || "",
      phone: cinema.phone || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return toast.error("Vui lòng nhập tên rạp.");

    setSubmitting(true);
    try {
      if (editingCinema) {
        await api.put(`/api/admin/cinemas/${editingCinema.id}`, form);
        toast.success("Cập nhật thông tin rạp thành công!");
      } else {
        await api.post("/api/admin/cinemas", form);
        toast.success("Thêm rạp chiếu mới thành công!");
      }
      setModalOpen(false);
      setReloadKey((key) => key + 1);
    } catch (err) {
      toast.error(err.message || "Có lỗi xảy ra.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cinema) => {
    if (cinema.roomCount > 0) {
      return toast.error(
        `Không thể xóa rạp "${cinema.name}" vì đang có ${cinema.roomCount} phòng chiếu.`,
      );
    }
    if (!(await confirm({
      title: "Xóa rạp chiếu?",
      message: `Bạn có chắc chắn muốn xóa rạp "${cinema.name}"?`,
      confirmLabel: "Xóa rạp",
      variant: "danger",
    }))) return;

    try {
      await api.delete(`/api/admin/cinemas/${cinema.id}`);
      toast.success("Đã xóa rạp chiếu phim.");
      if (cinemas.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        setReloadKey((key) => key + 1);
      }
    } catch (err) {
      toast.error(err.message || "Không thể xóa rạp.");
    }
  };

  const applyFilters = (event) => {
    event.preventDefault();
    setPage(1);
    setFilters({
      keyword: draftFilters.keyword.trim(),
      city: draftFilters.city.trim(),
      status: draftFilters.status.trim(),
    });
  };

  const resetFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const removeFilter = (key) => {
    const nextFilters = { ...filters, [key]: "" };
    setFilters(nextFilters);
    setDraftFilters(nextFilters);
    setPage(1);
  };

  return (
    <div className="max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Title text1="Quản Lý" text2="Rạp Chiếu Phim" />
          <p className="mt-2 text-sm text-gray-400">
            Tìm kiếm, lọc và quản lý thông tin các rạp chiếu phim.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Thêm rạp mới
        </button>
      </div>

      <section className="mt-6 rounded-2xl border border-primary/20 bg-gray-900/80 p-4 shadow-xl sm:p-5">
        <form onSubmit={applyFilters} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-medium text-gray-400">
            Từ khóa
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-gray-700 bg-black/40 px-3">
              <Search className="h-4 w-4 shrink-0 text-gray-500" />
              <input
                value={draftFilters.keyword}
                onChange={(event) => setDraftFilters({ ...draftFilters, keyword: event.target.value })}
                placeholder="Tên rạp"
                className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-gray-600"
              />
            </div>
          </label>
          <label className="text-xs font-medium text-gray-400">
            Thành phố
            <input
              value={draftFilters.city}
              onChange={(event) => setDraftFilters({ ...draftFilters, city: event.target.value })}
              placeholder="Nhập thành phố"
              className="mt-1.5 w-full rounded-xl border border-gray-700 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
            />
          </label>
          <label className="text-xs font-medium text-gray-400">
            Trạng thái (nếu có)
            <select
              value={draftFilters.status}
              onChange={(event) => setDraftFilters({ ...draftFilters, status: event.target.value })}
              className="mt-1.5 w-full rounded-xl border border-gray-700 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
            >
              <option value="" className="bg-[#111927]">Tất cả trạng thái</option>
              <option value="Active" className="bg-[#111927]">Active</option>
              <option value="Inactive" className="bg-[#111927]">Inactive</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-white transition hover:bg-primary/90"
            >
              <Search className="h-4 w-4" /> Tìm kiếm
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-700 px-3 py-2.5 text-sm text-gray-300 transition hover:bg-white/5"
              title="Xóa bộ lọc"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Đặt lại</span>
            </button>
          </div>
        </form>

        <div className="mt-4 flex flex-col gap-3 border-t border-gray-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-gray-500">Điều kiện đang áp dụng:</span>
            {activeFilters.length ? (
              activeFilters.map(([key, value]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => removeFilter(key)}
                  className="inline-flex max-w-full items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-primary"
                  title="Bỏ điều kiện này"
                >
                  <span className="truncate">
                    {key === "keyword" ? "Từ khóa" : key === "city" ? "Thành phố" : "Trạng thái"}: {value}
                  </span>
                  <X className="h-3 w-3 shrink-0" />
                </button>
              ))
            ) : (
              <span className="text-gray-500">Chưa có</span>
            )}
          </div>
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-2xl border border-primary/20 bg-gray-900/80 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3 sm:px-5">
          <h2 className="font-semibold text-white">Danh sách rạp</h2>
          <span className="text-xs text-gray-400">Tổng {totalItems} rạp</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm text-gray-300">
            <thead className="border-b border-gray-800 bg-black/40 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 sm:px-5">ID</th>
                <th className="px-4 py-3">Tên rạp</th>
                <th className="px-4 py-3">Địa chỉ</th>
                <th className="px-4 py-3">Thành phố</th>
                <th className="px-4 py-3 text-center">Phòng</th>
                <th className="px-4 py-3 text-center">Suất đang mở</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right sm:pr-5">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/80">
              {loading ? (
                Array.from({ length: 5 }, (_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 8 }, (_, cell) => (
                      <td key={cell} className="px-4 py-4">
                        <div className="h-4 animate-pulse rounded bg-gray-800" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <p className="font-medium text-red-300">{error}</p>
                    <button
                      onClick={() => setReloadKey((key) => key + 1)}
                      className="mt-3 rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-200 hover:bg-white/5"
                    >
                      Thử tải lại
                    </button>
                  </td>
                </tr>
              ) : cinemas.length ? (
                cinemas.map((cinema) => (
                  <tr key={cinema.id} className="transition-colors hover:bg-white/[0.04]">
                    <td className="px-4 py-4 font-mono text-xs text-gray-500 sm:px-5">#{cinema.id}</td>
                    <td className="max-w-52 px-4 py-4">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="rounded-lg bg-primary/10 p-2 text-primary">
                          <Building2 className="h-4 w-4" />
                        </span>
                        <span className="truncate font-medium text-white" title={cinema.name || ""}>
                          {cinema.name || "Chưa có tên"}
                        </span>
                      </div>
                    </td>
                    <td className="max-w-64 px-4 py-4">
                      <span className="block truncate text-gray-400" title={cinema.address || ""}>
                        {cinema.address || "Chưa cập nhật"}
                      </span>
                    </td>
                    <td className="max-w-40 px-4 py-4">
                      <span className="block truncate" title={cinema.city || ""}>{cinema.city || "—"}</span>
                    </td>
                    <td className="px-4 py-4 text-center">{Number(cinema.roomCount) || 0}</td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 text-gray-300">
                        <Film className="h-3.5 w-3.5 text-primary" />
                        {Number(cinema.activeShowsCount) || 0}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {cinema.status ? (
                        <span
                          className={`rounded-lg border px-2 py-1 text-xs ${
                            cinema.status === "Active"
                              ? "border-emerald-900/50 bg-emerald-950/60 text-emerald-300"
                              : cinema.status === "Inactive"
                                ? "border-red-900/50 bg-red-950/60 text-red-300"
                                : "border-gray-700 bg-gray-800 text-gray-300"
                          }`}
                        >
                          {cinema.status}
                        </span>
                      ) : (
                        <span className="text-gray-500">Chưa thiết lập</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right sm:pr-5">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          to={`/admin/cinemas/${cinema.id}`}
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-primary/10 hover:text-primary"
                          title="Xem chi tiết"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => openEdit(cinema)}
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cinema)}
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-red-950/40 hover:text-red-400"
                          title="Xóa rạp"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center">
                    <Building2 className="mx-auto h-9 w-9 text-gray-600" />
                    <p className="mt-3 font-medium text-gray-300">Không tìm thấy rạp chiếu phim</p>
                    <p className="mt-1 text-sm text-gray-500">Thử thay đổi từ khóa hoặc điều kiện lọc.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-800 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-gray-400">
            Trang {totalPages ? page : 0} / {totalPages} · {totalItems} bản ghi
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-gray-400">
              Mỗi trang
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-gray-700 bg-[#111927] px-2 py-1.5 text-gray-200 outline-none"
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>
            <button
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              disabled={loading || page <= 1}
              className="rounded-lg border border-gray-700 p-2 text-gray-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Trang trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-16 text-center text-xs text-gray-400">{page} / {totalPages || 0}</span>
            <button
              onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
              disabled={loading || !totalPages || page >= totalPages}
              className="rounded-lg border border-gray-700 p-2 text-gray-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Trang sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-gray-700 bg-[#111927] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <h3 className="text-lg font-bold text-white">
                {editingCinema ? "Cập Nhật Thông Tin Rạp" : "Thêm Rạp Chiếu Mới"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold uppercase text-gray-300">Tên rạp</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Ví dụ: RoPhim Vincom Bà Triệu"
                  className="mt-1 w-full rounded-xl border border-gray-700 bg-black/60 px-3.5 py-2.5 text-sm text-white focus:border-primary focus:outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-300">Thành phố</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(event) => setForm({ ...form, city: event.target.value })}
                    placeholder="Hà Nội, TP.HCM..."
                    className="mt-1 w-full rounded-xl border border-gray-700 bg-black/60 px-3.5 py-2.5 text-sm text-white focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-300">Số điện thoại</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    placeholder="024 3974..."
                    className="mt-1 w-full rounded-xl border border-gray-700 bg-black/60 px-3.5 py-2.5 text-sm text-white focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-300">Địa chỉ chi tiết</label>
                <textarea
                  value={form.address}
                  onChange={(event) => setForm({ ...form, address: event.target.value })}
                  rows={2}
                  placeholder="Tầng 5, TTTM Vincom Center, 191 Bà Triệu..."
                  className="mt-1 w-full rounded-xl border border-gray-700 bg-black/60 px-3.5 py-2.5 text-sm text-white focus:border-primary focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-gray-400 transition hover:bg-white/5"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? "Đang lưu..." : editingCinema ? "Cập nhật" : "Tạo rạp"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
