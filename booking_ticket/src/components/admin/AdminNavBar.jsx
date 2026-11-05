import { Menu } from "lucide-react";
import { Link } from "react-router";
import { assets } from "../../assets/assets";

export function AdminNavBar({ menuButtonRef, onMenuClick, sidebarOpen }) {
  return (
    <header className="admin-header">
      <div className="admin-header-brand">
        <button
          ref={menuButtonRef}
          type="button"
          className="admin-menu-button"
          onClick={onMenuClick}
          aria-label={sidebarOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
          aria-expanded={sidebarOpen}
          aria-controls="admin-navigation"
        >
          <Menu size={21} aria-hidden="true" />
        </button>
        <Link to="/home" className="admin-brand-link">
          <img src={assets.rophimlogo} alt="" className="admin-brand-logo" />
          <span>RoPhim</span>
        </Link>
      </div>
      <span className="admin-header-label">Quản trị rạp phim</span>
    </header>
  );
}
