import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { XIcon, LockIcon, MailIcon, UserIcon, PhoneIcon } from "lucide-react";

export function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalMode,
    setAuthModalMode,
    login,
    register,
  } = useAuth();

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Register form state
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  if (!isAuthModalOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await login(loginEmail, loginPassword);
    setIsSubmitting(false);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (regPassword !== regConfirmPassword) {
      alert("Mật khẩu xác nhận không khớp!");
      return;
    }
    setIsSubmitting(true);
    const success = await register({
      fullName: regFullName,
      email: regEmail,
      phone: regPhone,
      password: regPassword,
      confirmPassword: regConfirmPassword,
    });
    setIsSubmitting(false);
    if (success) {
      setLoginEmail(regEmail);
      setLoginPassword(regPassword);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-gray-900/95 border border-primary/30 rounded-2xl p-6 md:p-8 shadow-2xl text-white">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition cursor-pointer p-1 rounded-full hover:bg-white/10"
        >
          <XIcon className="w-5 h-5" />
        </button>

        {/* Modal Title & Tabs */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-red-400 bg-clip-text text-transparent">
            {authModalMode === "login" ? "Chào mừng trở lại!" : "Tạo tài khoản mới"}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {authModalMode === "login"
              ? "Đăng nhập để đặt vé và nhận ưu đãi độc quyền"
              : "Đăng ký thành viên RoPhim để trải nghiệm xem phim đỉnh cao"}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-black/40 p-1 rounded-xl mb-6 border border-white/5">
          <button
            type="button"
            onClick={() => setAuthModalMode("login")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
              authModalMode === "login"
                ? "bg-primary text-white shadow-lg"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => setAuthModalMode("register")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
              authModalMode === "register"
                ? "bg-primary text-white shadow-lg"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Đăng ký
          </button>
        </div>

        {/* Login Form */}
        {authModalMode === "login" ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Email
              </label>
              <div className="relative flex items-center">
                <MailIcon className="absolute left-3 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@moviebooking.com"
                  className="w-full bg-black/50 border border-gray-700 focus:border-primary rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Mật khẩu
              </label>
              <div className="relative flex items-center">
                <LockIcon className="absolute left-3 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/50 border border-gray-700 focus:border-primary rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-primary hover:bg-primary-dull text-white py-2.5 rounded-lg font-medium text-sm transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Đang xử lý..." : "Đăng nhập ngay"}
            </button>

            <div className="text-center text-xs text-gray-400 mt-3">
              Tài khoản mẫu:{" "}
              <span className="text-primary font-mono cursor-pointer" onClick={() => { setLoginEmail("admin@moviebooking.com"); setLoginPassword("Admin@123"); }}>
                Admin (click để điền)
              </span>{" "}
              |{" "}
              <span className="text-primary font-mono cursor-pointer" onClick={() => { setLoginEmail("user@moviebooking.com"); setLoginPassword("User@123"); }}>
                User (click)
              </span>
            </div>
          </form>
        ) : (
          /* Register Form */
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Họ và tên
              </label>
              <div className="relative flex items-center">
                <UserIcon className="absolute left-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full bg-black/50 border border-gray-700 focus:border-primary rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Email
              </label>
              <div className="relative flex items-center">
                <MailIcon className="absolute left-3 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-black/50 border border-gray-700 focus:border-primary rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Số điện thoại
              </label>
              <div className="relative flex items-center">
                <PhoneIcon className="absolute left-3 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="0912345678"
                  className="w-full bg-black/50 border border-gray-700 focus:border-primary rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Mật khẩu
                </label>
                <div className="relative flex items-center">
                  <LockIcon className="absolute left-2.5 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black/50 border border-gray-700 focus:border-primary rounded-lg pl-8 pr-2 py-2 text-sm text-white focus:outline-none transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Xác nhận MK
                </label>
                <div className="relative flex items-center">
                  <LockIcon className="absolute left-2.5 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black/50 border border-gray-700 focus:border-primary rounded-lg pl-8 pr-2 py-2 text-sm text-white focus:outline-none transition"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-primary hover:bg-primary-dull text-white py-2.5 rounded-lg font-medium text-sm transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Đang tạo tài khoản..." : "Đăng ký thành viên"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
