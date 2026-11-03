import { useEffect, useState } from "react";
import { Settings, Save, AlertTriangle, ShieldCheck, Mail, Phone, Clock, DollarSign } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { Loading } from "../../components/Loading";
import { Title } from "../../components/admin/Title";

export function SystemSettings() {
  const [settings, setSettings] = useState({
    brandName: "RoPhim Cinema",
    seatHoldMinutes: 10,
    defaultTicketPrice: 75000,
    vipPriceMultiplier: 1.2,
    customerSupportEmail: "support@moviebooking.com",
    customerSupportPhone: "1900 1234",
    allowOnlineCancellation: true,
    maintenanceMode: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await api.get("/api/admin/system/settings");
      if (data) {
        setSettings({
          brandName: data.brandName ?? "RoPhim Cinema",
          seatHoldMinutes: data.seatHoldMinutes ?? 10,
          defaultTicketPrice: data.defaultTicketPrice ?? 75000,
          vipPriceMultiplier: data.vipPriceMultiplier ?? 1.2,
          customerSupportEmail: data.customerSupportEmail ?? "support@moviebooking.com",
          customerSupportPhone: data.customerSupportPhone ?? "1900 1234",
          allowOnlineCancellation: data.allowOnlineCancellation ?? true,
          maintenanceMode: data.maintenanceMode ?? false,
        });
      }
    } catch (err) {
      toast.error(err.message || "Không thể tải cấu hình");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/admin/system/settings", {
        ...settings,
        seatHoldMinutes: Number(settings.seatHoldMinutes),
        defaultTicketPrice: Number(settings.defaultTicketPrice),
        vipPriceMultiplier: Number(settings.vipPriceMultiplier),
      });
      toast.success("Đã lưu cấu hình hệ thống thành công!");
    } catch (err) {
      toast.error(err.message || "Lỗi khi lưu cấu hình.");
    } finally {
      setSaving(false);
    }
  };

  return !loading ? (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Title text1="Quản Lý" text2="Cấu Hình Hệ Thống" />
        <span className="text-xs text-gray-400 font-mono">Các thông số vận hành toàn cục</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Thông tin thương hiệu & liên hệ */}
        <div className="bg-gray-900/80 rounded-2xl border border-primary/20 p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2 pb-3 border-b border-gray-800">
            <ShieldCheck className="w-5 h-5 text-primary" /> Nhận Diện & Kênh Hỗ Trợ
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-300 uppercase">Tên thương hiệu hệ thống</label>
              <input
                type="text"
                value={settings.brandName}
                onChange={(e) => setSettings({ ...settings, brandName: e.target.value })}
                className="mt-1.5 w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-300 uppercase">Hotline tổng đài</label>
              <input
                type="text"
                value={settings.customerSupportPhone}
                onChange={(e) => setSettings({ ...settings, customerSupportPhone: e.target.value })}
                className="mt-1.5 w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-primary text-sm font-mono"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-300 uppercase">Email chăm sóc khách hàng</label>
              <input
                type="email"
                value={settings.customerSupportEmail}
                onChange={(e) => setSettings({ ...settings, customerSupportEmail: e.target.value })}
                className="mt-1.5 w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-primary text-sm font-mono"
              />
            </div>
          </div>
        </div>

        {/* Thiết lập đặt vé & Ghế */}
        <div className="bg-gray-900/80 rounded-2xl border border-primary/20 p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2 pb-3 border-b border-gray-800">
            <Clock className="w-5 h-5 text-primary" /> Thông Số Bán Vé & Thời Gian Giữ Ghế
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-300 uppercase">Thời gian giữ ghế (Phút)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.seatHoldMinutes}
                onChange={(e) => setSettings({ ...settings, seatHoldMinutes: Number(e.target.value) })}
                className="mt-1.5 w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-primary text-sm font-mono"
                required
              />
              <p className="text-[11px] text-gray-500 mt-1">Hết thời gian ghế sẽ tự động nhả cho người khác.</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 uppercase">Giá vé mặc định (₫)</label>
              <input
                type="number"
                min="10000"
                step="5000"
                value={settings.defaultTicketPrice}
                onChange={(e) => setSettings({ ...settings, defaultTicketPrice: Number(e.target.value) })}
                className="mt-1.5 w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-primary text-sm font-mono"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 uppercase">Hệ số nhân ghế VIP</label>
              <input
                type="number"
                min="1"
                max="3"
                step="0.05"
                value={settings.vipPriceMultiplier}
                onChange={(e) => setSettings({ ...settings, vipPriceMultiplier: Number(e.target.value) })}
                className="mt-1.5 w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-primary text-sm font-mono"
                required
              />
              <p className="text-[11px] text-gray-500 mt-1">Ví dụ: 1.2 = phụ thu 20% giá vé thường.</p>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-800 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowOnlineCancellation}
                onChange={(e) => setSettings({ ...settings, allowOnlineCancellation: e.target.checked })}
                className="w-4 h-4 rounded accent-primary cursor-pointer"
              />
              <span className="text-sm text-gray-300">Cho phép khách hàng hủy vé trực tuyến trước 60 phút suất chiếu</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                className="w-4 h-4 rounded accent-red-500 cursor-pointer"
              />
              <span className="text-sm text-red-400 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Bật chế độ bảo trì hệ thống (Tạm khóa chức năng đặt vé)
              </span>
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition disabled:opacity-50 shadow-lg shadow-primary/20"
          >
            <Save className="w-4 h-4" /> {saving ? "Đang lưu..." : "Lưu Cấu Hình"}
          </button>
        </div>
      </form>
    </div>
  ) : (
    <Loading />
  );
}
