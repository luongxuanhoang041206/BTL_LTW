import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";
import toast from "react-hot-toast";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login");

  const checkAuth = async () => {
    try {
      const res = await api.get("/api/auth/me");
      if (res && res.isAuthenticated && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const openLogin = () => {
    setAuthModalMode("login");
    setIsAuthModalOpen(true);
  };

  const openRegister = () => {
    setAuthModalMode("register");
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const login = async (email, password) => {
    try {
      const res = await api.post("/api/auth/login", { email, password });
      if (res.success && res.user) {
        setUser(res.user);
        toast.success(res.message || "Đăng nhập thành công!");
        closeAuthModal();
        return true;
      }
    } catch (err) {
      toast.error(err.message || "Đăng nhập thất bại.");
      return false;
    }
  };

  const register = async (data) => {
    try {
      const res = await api.post("/api/auth/register", data);
      if (res.success) {
        toast.success(res.message || "Đăng ký thành công! Vui lòng đăng nhập.");
        setAuthModalMode("login");
        return true;
      }
    } catch (err) {
      toast.error(err.message || "Đăng ký thất bại.");
      return false;
    }
  };

  const logout = async () => {
    try {
      await api.post("/api/auth/logout", {});
      setUser(null);
      toast.success("Đã đăng xuất thành công.");
    } catch {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin: user?.role === "Admin",
        isAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        openLogin,
        openRegister,
        closeAuthModal,
        login,
        register,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
