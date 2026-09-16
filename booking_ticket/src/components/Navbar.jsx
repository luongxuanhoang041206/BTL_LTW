import { MenuIcon, SearchIcon, TicketPlus, XIcon, UserIcon, LogOutIcon, ShieldCheckIcon } from "lucide-react";
import { assets } from "../assets/assets";
import { Link, useNavigate } from "react-router";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { AuthModal } from "./AuthModal";

export function NavBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { user, isAdmin, openLogin, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <AuthModal />
      <div className="fixed top-0 left-0 z-40 w-full flex items-center justify-between px-6 md:px-16 lg:px-36 py-5 bg-black/40 backdrop-blur-md border-b border-white/5">
        <Link to="/home" className="w-36 flex justify-center items-center gap-2">
          <img src={assets.rophimlogo} alt="Logo" className="w-12 h-auto" />
          <h1 className="text-2xl font-bold tracking-wider bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
            RoPhim
          </h1>
        </Link>

        {/* Navigation Links */}
        <div
          className={`
            max-md:absolute max-md:top-0 max-md:left-0
            max-md:w-full max-md:h-screen
            max-md:bg-black/95
            max-md:flex-col max-md:justify-center max-md:items-center
            flex flex-row items-center justify-center gap-8
            font-medium text-sm z-50
            md:px-8 py-2.5 md:rounded-full
            backdrop-blur md:bg-white/10
            md:border border-gray-300/20
            transition-all duration-300
            ${isOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"}
          `}
        >
          <XIcon
            className="md:hidden absolute top-6 right-6 w-6 h-6 cursor-pointer text-gray-400"
            onClick={() => setIsOpen(false)}
          />
          <Link
            onClick={() => { scrollTo(0, 0); setIsOpen(false); }}
            to="/home"
            className="hover:text-primary transition"
          >
            Trang chủ
          </Link>
          <Link
            onClick={() => { scrollTo(0, 0); setIsOpen(false); }}
            to="/movies"
            className="hover:text-primary transition"
          >
            Phim đang chiếu
          </Link>
          <Link
            onClick={() => { scrollTo(0, 0); setIsOpen(false); }}
            to="/booking"
            className="hover:text-primary transition"
          >
            Vé của tôi
          </Link>
          <Link
            onClick={() => { scrollTo(0, 0); setIsOpen(false); }}
            to="/favourite"
            className="hover:text-primary transition"
          >
            Yêu thích
          </Link>
          {isAdmin && (
            <Link
              onClick={() => { scrollTo(0, 0); setIsOpen(false); }}
              to="/admin/dashboard"
              className="text-primary font-semibold hover:underline flex items-center gap-1"
            >
              <ShieldCheckIcon className="w-4 h-4" />
              Quản trị Admin
            </Link>
          )}
        </div>

        {/* Auth & Profile Actions */}
        <div className="flex items-center gap-4">
          {!user ? (
            <button
              onClick={openLogin}
              className="px-5 py-2 bg-primary hover:bg-primary-dull transition rounded-full font-medium text-sm cursor-pointer shadow-lg shadow-primary/30 active:scale-95"
            >
              Đăng nhập
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer border border-primary/40"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-orange-500 flex items-center justify-center text-white font-bold text-xs uppercase">
                  {user.fullName ? user.fullName.substring(0, 2) : "U"}
                </div>
                <span className="max-md:hidden text-xs font-medium pr-2 text-gray-200">
                  {user.fullName}
                </span>
              </button>

              {/* Profile Dropdown */}
              {isDropdownOpen && (
                <div
                  onMouseLeave={() => setIsDropdownOpen(false)}
                  className="absolute right-0 mt-3 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-2 z-50 text-sm animate-fadeIn"
                >
                  <div className="px-3 py-2 border-b border-gray-800">
                    <p className="font-semibold text-white truncate">{user.fullName}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 uppercase font-mono">
                      {user.role}
                    </span>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        navigate("/booking");
                      }}
                      className="w-full text-left px-3 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2 transition"
                    >
                      <TicketPlus className="w-4 h-4 text-primary" />
                      Vé của tôi
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          navigate("/admin/dashboard");
                        }}
                        className="w-full text-left px-3 py-2 text-primary hover:bg-primary/10 rounded-lg flex items-center gap-2 transition font-medium"
                      >
                        <ShieldCheckIcon className="w-4 h-4" />
                        Trang Quản trị Admin
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2 transition mt-1 border-t border-gray-800"
                    >
                      <LogOutIcon className="w-4 h-4" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <MenuIcon
            className="md:hidden w-7 h-7 cursor-pointer text-gray-300"
            onClick={() => setIsOpen(true)}
          />
        </div>
      </div>
    </>
  );
}
