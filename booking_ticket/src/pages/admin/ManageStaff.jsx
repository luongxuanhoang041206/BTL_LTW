import { useEffect, useState } from "react";
import { Users, Plus, Edit2, Shield, Lock, Unlock, Mail, Phone, X } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { Loading } from "../../components/Loading";
import { Title } from "../../components/admin/Title";

export function ManageStaff() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    role: "Staff",
    status: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await api.get("/api/admin/system/users");
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message || "Không thể tải danh sách tài khoản quản trị");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openAdd = () => {
    setEditingUser(null);
    setForm({ fullName: "", email: "", password: "", phone: "", role: "Staff", status: true });
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setForm({
      fullName: u.fullName,
      email: u.email,
      password: "",
      phone: u.phone || "",
      role: u.role,
      status: u.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.email.trim()) {
      return toast.error("Vui lòng điền họ tên và email.");
    }
    setSubmitting(true);
    try {
      if (editingUser) {
        await api.put(`/api/admin/system/users/${editingUser.id}`, form);
        toast.success("Cập nhật tài khoản quản trị thành công!");
      } else {
        await api.post("/api/admin/system/users", form);
        toast.success("Tạo tài khoản quản trị mới thành công!");
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.message || "Có lỗi xảy ra.");
    } finally {
      setSubmitting(false);
    }
  };

  return !loading ? (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between">
        <Title text1="Quản Lý" text2="Tài Khoản Quản Trị" />
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl text-sm transition"
        >
          <Plus className="w-4 h-4" /> Thêm Tài Khoản
        </button>
      </div>

      <div className="mt-6 bg-gray-900/80 rounded-xl border border-primary/20 shadow-xl overflow-hidden">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-black/60 text-xs text-gray-400 uppercase border-b border-gray-800">
            <tr>
              <th className="p-4 pl-6">Họ Và Tên</th>
              <th className="p-4">Email</th>
              <th className="p-4">Số Điện Thoại</th>
              <th className="p-4 text-center">Vai Trò</th>
              <th className="p-4 text-center">Trạng Thái</th>
              <th className="p-4">Ngày Tạo</th>
              <th className="p-4 text-right pr-6">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {users.length > 0 ? (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-white/5 transition">
                  <td className="p-4 pl-6 font-semibold text-white flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-950 text-blue-300 border border-blue-800 flex items-center justify-center font-bold text-xs">
                      {u.fullName?.[0]?.toUpperCase() || "A"}
                    </div>
                    {u.fullName}
                  </td>
                  <td className="p-4 text-gray-400 font-mono text-xs">{u.email}</td>
                  <td className="p-4 text-gray-300 font-mono text-xs">{u.phone || "---"}</td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        u.role === "Admin"
                          ? "bg-red-950/60 text-red-300 border-red-800"
                          : "bg-blue-950/60 text-blue-300 border-blue-800"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        u.status ? "text-emerald-400" : "text-gray-500"
                      }`}
                    >
                      {u.status ? "Hoạt động" : "Tạm khóa"}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400 text-xs font-mono">{u.createdAt}</td>
                  <td className="p-4 text-right pr-6">
                    <button
                      onClick={() => openEdit(u)}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                      title="Chỉnh sửa tài khoản"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="p-8 text-center text-gray-400">
                  Chưa có tài khoản quản trị nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111927] border border-gray-700 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white">
                {editingUser ? "Cập Nhật Tài Khoản" : "Thêm Tài Khoản Quản Trị"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-gray-300 uppercase">Họ và tên</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="mt-1 w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-primary text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 uppercase">Email đăng nhập</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="admin@moviebooking.com"
                  className="mt-1 w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-primary text-sm font-mono"
                  required
                  disabled={!!editingUser}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 uppercase">
                  {editingUser ? "Mật khẩu mới (bỏ trống nếu không đổi)" : "Mật khẩu"}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="mt-1 w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-primary text-sm"
                  required={!editingUser}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300 uppercase">Số điện thoại</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="0901234567"
                    className="mt-1 w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-primary text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-300 uppercase">Phân quyền</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="mt-1 w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-primary text-sm"
                  >
                    <option value="Staff">Staff (Nhân viên)</option>
                    <option value="Admin">Admin (Quản trị viên)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="userStatus"
                  checked={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.checked })}
                  className="rounded accent-primary w-4 h-4"
                />
                <label htmlFor="userStatus" className="text-xs text-gray-300 cursor-pointer">
                  Kích hoạt tài khoản ngay sau khi lưu
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:bg-white/5 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-medium transition disabled:opacity-50"
                >
                  {submitting ? "Đang lưu..." : editingUser ? "Cập nhật" : "Tạo tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  ) : (
    <Loading />
  );
}
