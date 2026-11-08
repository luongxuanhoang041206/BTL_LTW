import { CircleDollarSign, Ticket, TrendingUp } from "lucide-react";
import { formatVnd } from "../../../lib/revenuePeriods";

const CARDS = [
  {
    key: "revenue",
    label: "Tổng doanh thu thực tế",
    icon: CircleDollarSign,
    valueClass: "text-emerald-400",
    iconClass: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    value: (data) => formatVnd(data.totalRevenue),
  },
  {
    key: "bookings",
    label: "Đơn vé đã thanh toán",
    icon: Ticket,
    valueClass: "text-white",
    iconClass: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    value: (data) => `${data.totalConfirmedBookings ?? 0} đơn`,
  },
  {
    key: "average",
    label: "Giá trị trung bình / đơn",
    icon: TrendingUp,
    valueClass: "text-primary",
    iconClass: "bg-primary/10 border-primary/20 text-primary",
    value: (data) => formatVnd(data.avgTicketValue),
  },
];

export function RevenueSummaryCards({ data }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
      {CARDS.map(({ key, label, icon: Icon, valueClass, iconClass, value }) => (
        <div
          key={key}
          className="flex items-center justify-between rounded-2xl border border-primary/20 bg-gray-900/90 p-5 shadow-xl"
        >
          <div>
            <p className="text-xs font-semibold text-gray-400">{label}</p>
            {data ? (
              <p className={`mt-1 font-mono text-2xl font-bold ${valueClass}`}>{value(data)}</p>
            ) : (
              <p className="mt-1 h-8 w-32 animate-pulse rounded bg-slate-800" aria-hidden="true" />
            )}
          </div>
          <div className={`rounded-xl border p-3.5 ${iconClass}`}>
            <Icon className="h-7 w-7" />
          </div>
        </div>
      ))}
    </div>
  );
}