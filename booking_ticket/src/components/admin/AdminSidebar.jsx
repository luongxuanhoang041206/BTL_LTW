import {
  Film,
  Clapperboard,
  Building2,
  Gauge,
  Activity,
  Calendar,
  Ticket,
  CreditCard,
  Zap,
  Users,
  ShieldCheck,
  BarChart2,
  Clock,
  Settings,
  LayoutDashboard,
  Utensils,
} from "lucide-react";
import { NavLink } from "react-router";

export function AdminSideBar() {
  const navSections = [
    {
      title: "TỔNG QUAN",
      items: [
        { name: "Bảng điều khiển", path: "/admin", icon: LayoutDashboard },
      ],
    },
    {
      title: "NỘI DUNG PHIM",
      items: [
        { name: "Danh sách phim", path: "/admin/movies", icon: Film },
        { name: "Thể loại phim", path: "/admin/genres", icon: Clapperboard },
        { name: "Đồ ăn & combo", path: "/admin/fnb", icon: Utensils },
      ],
    },
    {
      title: "HỆ THỐNG RẠP",
      items: [
        { name: "Danh sách rạp", path: "/admin/cinemas", icon: Building2 },
        { name: "Phòng chiếu", path: "/admin/rooms", icon: Gauge },
        { name: "Sơ đồ ghế", path: "/admin/seat-map", icon: Activity },
      ],
    },
    {
      title: "VẬN HÀNH",
      items: [
        { name: "Lịch chiếu", path: "/admin/shows", icon: Calendar },
        { name: "Đặt vé", path: "/admin/bookings", icon: Ticket },
        { name: "Thanh toán", path: "/admin/payments", icon: CreditCard },
        { name: "Khuyến mãi", path: "/admin/promotions", icon: Zap },
      ],
    },
    {
      title: "KHÁCH HÀNG",
      items: [
        { name: "Khách hàng", path: "/admin/customers", icon: Users },
        { name: "Đánh giá phim", path: "/admin/reviews", icon: ShieldCheck },
      ],
    },
    {
      title: "PHÂN TÍCH",
      items: [
        { name: "Báo cáo doanh thu", path: "/admin/reports/revenue", icon: BarChart2 },
        { name: "Hiệu suất suất chiếu", path: "/admin/reports/showtime-performance", icon: Clock },
        { name: "Tỷ lệ lấp đầy ghế", path: "/admin/reports/seat-occupancy", icon: Activity },
      ],
    },
    {
      title: "QUẢN TRỊ HỆ THỐNG",
      items: [
        { name: "Tài khoản quản trị", path: "/admin/system/users", icon: Users },
        { name: "Phân quyền", path: "/admin/system/roles", icon: ShieldCheck },
        { name: "Nhật ký quản trị", path: "/admin/system/audit-logs", icon: Clock },
        { name: "Cấu hình hệ thống", path: "/admin/system/settings", icon: Settings },
      ],
    },
  ];

  return (
    <aside className="h-[calc(100vh-64px)] w-64 min-w-[240px] shrink-0 bg-[#090e17] border-r border-[#1a2638] overflow-y-auto px-3 py-3 select-none">
      <div className="space-y-4">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            <h3 className="text-[11px] font-bold tracking-wider text-[#546b8a] uppercase px-3 pt-2 pb-1">
              {section.title}
            </h3>
            <div className="space-y-0.5">
              {section.items.map((item, iIdx) => {
                const IconComponent = item.icon;
                return (
                  <NavLink
                    key={iIdx}
                    to={item.path}
                    end={item.path === "/admin"}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] transition-colors ${
                        isActive
                          ? "bg-[#162237] text-white font-medium shadow-sm"
                          : "text-[#8e9eb5] hover:text-white hover:bg-[#111c2e]"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <IconComponent
                          className={`w-[18px] h-[18px] shrink-0 ${
                            isActive ? "text-white" : "text-[#8e9eb5]"
                          }`}
                          strokeWidth={isActive ? 2.2 : 1.8}
                        />
                        <span className="truncate">{item.name}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
