import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft, Eye, EyeOff, KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const { openLogin } = useAuth();
  const [token] = useState(() => new URLSearchParams(location.search).get("token") || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (token && location.search) {
      navigate(location.pathname, { replace: true });
    }
  }, [token, location.pathname, location.search, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!newPassword || !confirmPassword) {
      setError("Vui lòng nhập đầy đủ mật khẩu.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.post("/api/auth/reset-password", {
        token,
        newPassword,
        confirmPassword,
      });
      toast.success(response?.message || "Đặt lại mật khẩu thành công. Vui lòng đăng nhập.");
      navigate("/", { replace: true });
      openLogin();
    } catch (requestError) {
      setError(requestError.message || "Không thể đặt lại mật khẩu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <main className="min-h-screen px-4 pt-28 pb-20 text-white">
        <section className="mx-auto max-w-lg rounded-3xl border border-primary/20 bg-gray-900/80 p-6 text-center shadow-2xl backdrop-blur-sm md:p-8">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">Liên kết không hợp lệ</h1>
          <p className="mt-2 text-sm text-gray-400">Liên kết đặt lại mật khẩu không hợp lệ hoặc không đầy đủ.</p>
          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-dull"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 pt-28 pb-20 text-white">
      <section className="mx-auto max-w-lg rounded-3xl border border-primary/20 bg-gray-900/80 p-6 shadow-2xl backdrop-blur-sm md:p-8">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
          <KeyRound className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold md:text-3xl">Đặt lại mật khẩu</h1>
        <p className="mt-2 text-sm text-gray-400">Tạo mật khẩu mới để tiếp tục sử dụng tài khoản.</p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div>
            <label htmlFor="new-password" className="mb-2 block text-sm font-medium text-gray-300">
              Mật khẩu mới
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={6}
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  setError("");
                }}
                className="w-full rounded-lg border border-gray-700 bg-black/50 px-4 py-3 pr-12 text-sm text-white transition focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((shown) => !shown)}
                aria-label={showNewPassword ? "Ẩn mật khẩu mới" : "Hiện mật khẩu mới"}
                aria-pressed={showNewPassword}
                className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 transition hover:text-white"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-gray-300">
              Xác nhận mật khẩu
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setError("");
                }}
                className="w-full rounded-lg border border-gray-700 bg-black/50 px-4 py-3 pr-12 text-sm text-white transition focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((shown) => !shown)}
                aria-label={showConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"}
                aria-pressed={showConfirmPassword}
                className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 transition hover:text-white"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-dull disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Đang cập nhật..." : "Đặt lại mật khẩu"}
          </button>
        </form>
      </section>
    </main>
  );
}
