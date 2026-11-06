import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Building2, Edit2, Film, MapPin, Phone, Users } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { getAdminCinemaDetail } from "../../lib/cinemaApi";

const EMPTY_FORM = { name: "", address: "", city: "", phone: "" };

export function CinemaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cinema, setCinema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchCinema = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getAdminCinemaDetail(id);
        if (!active) return;
        setCinema(data);
        setForm({
          name: data?.name || "",
          address: data?.address || "",
          city: data?.city || "",
          phone: data?.phone || "",
        });
      } catch (requestError) {
        if (active) {
          setCinema(null);
          setError(requestError.message || "Không thể tải thông tin rạp.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchCinema();
    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  const rooms = Array.isArray(cinema?.rooms) ? cinema.rooms : [];
  const totalSeats = rooms.reduce((total, room) => total + (Number(room?.totalSeats) || 0), 0);

  const saveCinema = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return toast.error("Vui lòng nhập tên rạp.");

    setSaving(true);
    try {
      await api.put(`/api/admin/cinemas/${id}`, form);
      toast.success("Cập nhật thông tin rạp thành công!");
      setEditing(false);
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      toast.error(requestError.message || "Không thể cập nhật thông tin rạp.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl animate-pulse space-y-5">
        <div className="h-7 w-64 rounded bg-gray-800" />
        <div className="h-36 rounded-2xl border border-gray-800 bg-gray-900" />
        <div className="h-64 rounded-2xl border border-gray-800 bg-gray-900" />
      </div>
    );
  }

  if (error || !cinema) {
    return (
      <div className="max-w-4xl rounded-2xl border border-red-900/50 bg-gray-900/80 p-6">
        <p className="font-medium text-red-300">{error || "Không tìm thấy rạp chiếu phim."}</p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => setReloadKey((key) => key + 1)}
            className="rounded-xl border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-white/5"
          >
            Thử tải lại
          </button>
          <button
            onClick={() => navigate("/admin/cinemas")}
            className="rounded-xl bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90"
          >
            Danh sách rạp
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <nav className="mb-2 flex items-center gap-2 text-sm text-gray-500" aria-label="Breadcrumb">
            <Link to="/admin/cinemas" className="hover:text-primary">Quản lý rạp</Link>
            <span>/</span>
            <span className="text-gray-300">Chi tiết rạp</span>
          </nav>
          <h1 className="break-words text-2xl font-semibold text-white">{cinema.name || "Chi tiết rạp"}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate("/admin/cinemas")}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-700 px-3.5 py-2.5 text-sm text-gray-300 transition hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" /> Danh sách rạp
          </button>
          <button
            onClick={() => {
              setForm({
                name: cinema.name || "",
                address: cinema.address || "",
                city: cinema.city || "",
                phone: cinema.phone || "",
              });
              setEditing((current) => !current);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-medium text-white transition hover:bg-primary/90"
          >
            <Edit2 className="h-4 w-4" /> {editing ? "Đóng chỉnh sửa" : "Chỉnh sửa"}
          </button>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-primary/20 bg-gray-900/80 p-5">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-primary/10 p-3 text-primary"><Building2 className="h-5 w-5" /></span>
            <div>
              <p className="text-xs text-gray-500">Mã rạp</p>
              <p className="mt-1 font-semibold text-white">#{cinema.id}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-gray-900/80 p-5">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-blue-500/10 p-3 text-blue-300"><Film className="h-5 w-5" /></span>
            <div>
              <p className="text-xs text-gray-500">Tổng số phòng</p>
              <p className="mt-1 font-semibold text-white">{rooms.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-gray-900/80 p-5">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-emerald-500/10 p-3 text-emerald-300"><Users className="h-5 w-5" /></span>
            <div>
              <p className="text-xs text-gray-500">Tổng số ghế</p>
              <p className="mt-1 font-semibold text-white">{totalSeats}</p>
            </div>
          </div>
        </div>
      </section>

      {editing ? (
        <form onSubmit={saveCinema} className="mt-5 rounded-2xl border border-primary/20 bg-gray-900/80 p-5">
          <h2 className="mb-4 font-semibold text-white">Chỉnh sửa thông tin rạp</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-xs font-medium text-gray-400">
              Tên rạp
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
                className="mt-1.5 w-full rounded-xl border border-gray-700 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
              />
            </label>
            <label className="text-xs font-medium text-gray-400">
              Thành phố
              <input
                value={form.city}
                onChange={(event) => setForm({ ...form, city: event.target.value })}
                className="mt-1.5 w-full rounded-xl border border-gray-700 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
              />
            </label>
            <label className="text-xs font-medium text-gray-400">
              Điện thoại
              <input
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                className="mt-1.5 w-full rounded-xl border border-gray-700 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
              />
            </label>
            <label className="text-xs font-medium text-gray-400 sm:col-span-2">
              Địa chỉ
              <textarea
                value={form.address}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
                rows={2}
                className="mt-1.5 w-full rounded-xl border border-gray-700 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-xl border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      ) : (
        <section className="mt-5 rounded-2xl border border-primary/20 bg-gray-900/80 p-5">
          <h2 className="mb-4 font-semibold text-white">Thông tin rạp</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex min-w-0 items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Địa chỉ</p>
                <p className="mt-1 break-words text-sm text-gray-200">{cinema.address || "Chưa cập nhật"}</p>
              </div>
            </div>
            <div className="flex min-w-0 items-start gap-3">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Thành phố</p>
                <p className="mt-1 break-words text-sm text-gray-200">{cinema.city || "Chưa cập nhật"}</p>
              </div>
            </div>
            <div className="flex min-w-0 items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Điện thoại</p>
                <p className="mt-1 break-words text-sm text-gray-200">{cinema.phone || "Chưa cập nhật"}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="mt-5 overflow-hidden rounded-2xl border border-primary/20 bg-gray-900/80">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 px-4 py-4 sm:px-5">
          <div>
            <h2 className="font-semibold text-white">Phòng chiếu</h2>
            <p className="mt-1 text-xs text-gray-500">{rooms.length} phòng trực thuộc rạp</p>
          </div>
          <Link
            to={`/admin/rooms?cinemaId=${cinema.id}`}
            className="rounded-xl border border-gray-700 px-3.5 py-2 text-sm text-gray-300 transition hover:bg-white/5"
          >
            Quản lý phòng chiếu
          </Link>
        </div>
        {rooms.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm text-gray-300">
              <thead className="bg-black/40 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">Mã phòng</th>
                  <th className="px-5 py-3">Tên phòng</th>
                  <th className="px-5 py-3 text-right">Tổng số ghế</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {rooms.map((room) => (
                  <tr key={room.id} className="transition-colors hover:bg-white/[0.04]">
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">#{room.id}</td>
                    <td className="max-w-80 px-5 py-3">
                      <span className="block truncate text-white" title={room.name || ""}>{room.name || "Chưa có tên"}</span>
                    </td>
                    <td className="px-5 py-3 text-right">{Number(room.totalSeats) || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <Film className="mx-auto h-9 w-9 text-gray-600" />
            <p className="mt-3 font-medium text-gray-300">Rạp chưa có phòng chiếu</p>
            <p className="mt-1 text-sm text-gray-500">Bạn có thể thêm phòng từ trang quản lý phòng chiếu.</p>
          </div>
        )}
      </section>
    </div>
  );
}
