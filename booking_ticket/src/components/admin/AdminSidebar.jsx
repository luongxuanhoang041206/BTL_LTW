import {
  Film,
  Clapperboard,
  Building2,
  Gauge,
  Calendar,
  Ticket,
  CreditCard,
  Zap,
  Users,
  ShieldCheck,
  BarChart2,
  Settings,
  LayoutDashboard,
  Utensils,
  PanelsTopLeft,
  X,
} from "lucide-react";
import { NavLink } from "react-router";

export function AdminSideBar({ isOpen, onNavigate, onClose }) {
  const navSections = [
    {
      title: "Tổng quan",
      items: [
        { name: "Bảng điều khiển", path: "/admin", icon: LayoutDashboard },
      ],
    },
    { title: "Website", items: [{ name: "Quản lý website", path: "/admin/website", icon: PanelsTopLeft }] },
    {
      title: "Nội dung phim",
      items: [
        { name: "Danh sách phim", path: "/admin/movies", icon: Film },
        { name: "Thể loại phim", path: "/admin/genres", icon: Clapperboard },
        { name: "Đồ ăn & combo", path: "/admin/fnb", icon: Utensils },
      ],
    },
    {
      title: "Hệ thống rạp",
      items: [
        { name: "Danh sách rạp", path: "/admin/cinemas", icon: Building2 },
        { name: "Phòng chiếu", path: "/admin/rooms", icon: Gauge },
      ],
    },
    {
      title: "Vận hành",
      items: [
        { name: "Lịch chiếu", path: "/admin/shows", icon: Calendar },
        { name: "Đặt vé", path: "/admin/bookings", icon: Ticket },
        { name: "Thanh toán", path: "/admin/payments", icon: CreditCard },
        { name: "Khuyến mãi", path: "/admin/promotions", icon: Zap },
      ],
    },
    {
      title: "Khách hàng",
      items: [
        { name: "Khách hàng", path: "/admin/customers", icon: Users },
        { name: "Đánh giá phim", path: "/admin/reviews", icon: ShieldCheck },
      ],
    },
    {
      title: "Phân tích",
      items: [
        { name: "Báo cáo doanh thu", path: "/admin/reports/revenue", icon: BarChart2 },
      ],
    },
    {
      title: "Quản trị hệ thống",
      items: [
        { name: "Tài khoản quản trị", path: "/admin/system/users", icon: Users },
        { name: "Cấu hình hệ thống", path: "/admin/system/settings", icon: Settings },
      ],
    },
  ];

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="admin-sidebar-overlay"
          onClick={onClose}
          aria-label="Đóng menu điều hướng"
        />
      )}
      <aside
        id="admin-navigation"
        aria-label="Điều hướng quản trị"
        className={`admin-sidebar${isOpen ? " is-open" : ""}`}
      >
        <div className="admin-sidebar-mobile-heading">
          <span>Điều hướng</span>
          <button type="button" onClick={onClose} aria-label="Đóng menu điều hướng">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <nav className="admin-sidebar-sections">
          {navSections.map((section) => (
            <section key={section.title} className="admin-sidebar-section">
              <h2 className="admin-sidebar-section-title">{section.title}</h2>
              <div className="admin-sidebar-links">
                {section.items.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === "/admin"}
                      title={item.name}
                      aria-label={item.name}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        `admin-sidebar-link${isActive ? " is-active" : ""}`
                      }
                    >
                      <IconComponent size={18} strokeWidth={1.8} aria-hidden="true" />
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>
      </aside>
    </>
  );
}
