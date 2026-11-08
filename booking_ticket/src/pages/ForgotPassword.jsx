import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Mail, Send } from "lucide-react";
import { api } from "../lib/api";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_SUCCESS_MESSAGE = "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (remainingSeconds <= 0) return undefined;

    const timer = window.setInterval(() => {
      setRemainingSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [remainingSeconds]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim();

    if (normalizedEmail.length > 100 || !EMAIL_PATTERN.test(normalizedEmail)) {
      setError("Vui lòng nhập email hợp lệ (tối đa 100 ký tự).");
      setMessage("");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await api.post("/api/auth/forgot-password", { email: normalizedEmail });
      setMessage(response?.message || GENERIC_SUCCESS_MESSAGE);
      setRemainingSeconds(60);
    } catch (requestError) {
      setError(requestError.message || "Không thể gửi yêu cầu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 pt-28 pb-20 text-white">
      <div className="mx-auto max-w-lg">
        <section className="rounded-3xl border border-primary/20 bg-gray-900/80 p-6 shadow-2xl backdrop-blur-sm md:p-8">
          <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Trang chủ
          </Link>

          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
            <Mail className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold md:text-3xl">Quên mật khẩu?</h1>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            Nhập email của bạn. Nếu email tồn tại, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="forgot-email" className="mb-2 block text-sm font-medium text-gray-300">
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                required
                maxLength={100}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                placeholder="name@example.com"
                className="w-full rounded-lg border border-gray-700 bg-black/50 px-4 py-3 text-sm text-white transition focus:border-primary focus:outline-none"
              />
            </div>

            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
            {message && <p role="status" className="rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-300">{message}</p>}

            <button
              type="submit"
              disabled={loading || remainingSeconds > 0}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-dull disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {loading ? "Đang gửi..." : remainingSeconds > 0 ? `Gửi lại sau ${remainingSeconds} giây` : "Gửi hướng dẫn"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
