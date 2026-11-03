import { useEffect, useState } from "react";
import { ShieldCheck, Users, Check, Lock, Info } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { Loading } from "../../components/Loading";
import { Title } from "../../components/admin/Title";

export function ManageRoles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const data = await api.get("/api/admin/system/roles");
      setRoles(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message || "Không thể tải danh sách quyền");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  return !loading ? (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <Title text1="Quản Lý" text2="Phân Quyền & Vai Trò" />
        <span className="text-xs text-gray-400 font-mono">Ma trận quyền hạn hệ thống</span>
      </div>

      <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/60 text-xs text-blue-300 flex items-start gap-2.5">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Hệ thống áp dụng Role-Based Access Control (RBAC) trên các vai trò chính: <strong>Admin</strong>, <strong>Staff</strong>, và <strong>Customer</strong>. Các API và trang quản trị được bảo vệ nghiêm ngặt ở cả tầng frontend và backend.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {roles.map((r, idx) => (
          <div
            key={idx}
            className="bg-gray-900/80 rounded-2xl border border-primary/20 p-6 shadow-xl flex flex-col justify-between hover:border-primary/40 transition"
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2.5 rounded-xl border ${
                      r.roleName === "Admin"
                        ? "bg-red-950/60 text-red-400 border-red-800"
                        : r.roleName === "Staff"
                        ? "bg-blue-950/60 text-blue-400 border-blue-800"
                        : "bg-emerald-950/60 text-emerald-400 border-emerald-800"
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-white text-lg">{r.roleName}</h3>
                </div>
                <span className="text-xs text-gray-400 font-mono">
                  {r.userCount} tài khoản
                </span>
              </div>

              <p className="text-xs text-gray-400 mt-3 leading-relaxed min-h-10">
                {r.description}
              </p>

              <div className="mt-5 space-y-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Quyền Hạn Được Cấp
                </p>
                {r.permissions?.map((perm, pIdx) => (
                  <div key={pIdx} className="flex items-start gap-2 text-xs text-gray-300">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{perm}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-800 text-center">
              <span className="text-[11px] text-gray-500 font-mono">
                {r.roleName === "Admin" ? "Toàn quyền hệ thống" : "Quyền hạn tiêu chuẩn"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  ) : (
    <Loading />
  );
}
