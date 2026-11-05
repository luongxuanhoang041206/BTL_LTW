import { useEffect, useState } from "react";
import { CircleDollarSign, TrendingUp, Ticket, Building2, Calendar, Film } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { Loading } from "../../components/Loading";
import { Title } from "../../components/admin/Title";

const CHART_WIDTH = 760;
const CHART_HEIGHT = 280;
const CHART_MARGIN = { top: 24, right: 20, bottom: 52, left: 82 };

function formatCurrency(value) {
  return `${Number(value).toLocaleString("vi-VN")} ₫`;
}

function formatAxisValue(value) {
  return Number(value).toLocaleString("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

function formatChartDate(value) {
  const date = String(value ?? "");
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return date || "—";
  return `${match[3]}/${match[2]}`;
}

function RevenueChart({ items }) {
  if (items.length === 0) {
    return <p className="py-12 text-center text-sm text-slate-400">Chưa có dữ liệu doanh thu theo ngày.</p>;
  }

  if (items.some((item) => !Number.isFinite(Number(item.revenue)))) {
    return (
      <p className="py-12 text-center text-sm text-rose-300" role="alert">
        Dữ liệu doanh thu theo ngày không hợp lệ.
      </p>
    );
  }

  const values = items.map((item) => Number(item.revenue));
  const peak = Math.max(...values);
  const rawStep = peak > 0 ? peak / 4 : 1;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalizedStep = rawStep / magnitude;
  const niceFactor = normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10;
  const step = niceFactor * magnitude;
  const axisMaximum = Math.max(step, Math.ceil(peak / step) * step);
  const plotWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
  const plotHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const baseline = CHART_MARGIN.top + plotHeight;
  const bandWidth = plotWidth / items.length;
  const barWidth = Math.min(42, bandWidth * 0.58);

  return (
    <div className="admin-chart-scroll">
      <svg
        className="admin-revenue-chart"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-labelledby="revenue-chart-title revenue-chart-description"
      >
        <title id="revenue-chart-title">Doanh thu theo ngày</title>
        <desc id="revenue-chart-description">
          Biểu đồ cột doanh thu theo từng ngày, đơn vị đồng Việt Nam.
        </desc>
        <text x={CHART_MARGIN.left} y="14" className="admin-chart-unit">Doanh thu (₫)</text>
        {Array.from({ length: 5 }, (_, index) => {
          const value = (axisMaximum / 4) * index;
          const y = baseline - (value / axisMaximum) * plotHeight;
          return (
            <g key={index}>
              <line
                x1={CHART_MARGIN.left}
                x2={CHART_WIDTH - CHART_MARGIN.right}
                y1={y}
                y2={y}
                className="admin-chart-gridline"
              />
              <text
                x={CHART_MARGIN.left - 10}
                y={y + 4}
                textAnchor="end"
                className="admin-chart-axis-label"
              >
                {formatAxisValue(value)}
              </text>
            </g>
          );
        })}
        {items.map((item, index) => {
          const value = values[index];
          const x = CHART_MARGIN.left + bandWidth * (index + 0.5);
          const barHeight = (value / axisMaximum) * plotHeight;
          const date = String(item.date ?? "");
          const label = `${date || "Ngày không xác định"}: ${formatCurrency(value)}`;
          return (
            <g key={`${date}-${index}`}>
              {value > 0 ? (
                <rect
                  x={x - barWidth / 2}
                  y={baseline - barHeight}
                  width={barWidth}
                  height={barHeight}
                  rx="3"
                  className="admin-chart-bar"
                  tabIndex="0"
                  aria-label={label}
                >
                  <title>{label}</title>
                </rect>
              ) : (
                <circle
                  cx={x}
                  cy={baseline}
                  r="4"
                  className="admin-chart-zero"
                  tabIndex="0"
                  aria-label={label}
                >
                  <title>{label}</title>
                </circle>
              )}
              <text
                x={x}
                y={baseline + 22}
                textAnchor="middle"
                className="admin-chart-axis-label"
              >
                {formatChartDate(date)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function RevenueReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadRevenue = async () => {
      try {
        const res = await api.get("/api/admin/analytics/revenue");
        if (active) setData(res);
      } catch (err) {
        if (active) toast.error(err.message || "Không thể tải báo cáo doanh thu");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadRevenue();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <Loading />;
  if (!data) return <div className="p-8 text-center text-gray-400">Không có dữ liệu báo cáo.</div>;

  const dailyRevenue = Array.isArray(data.dailyRevenue) ? data.dailyRevenue : [];

  return (
    <div className="max-w-6xl space-y-8">
      <div className="flex items-center justify-between">
        <Title text1="Báo Cáo" text2="Doanh Thu & Tài Chính" />
        <span className="text-xs text-gray-400">Dữ liệu thời gian thực từ cơ sở dữ liệu</span>
      </div>

      {/* Cards thống kê chính */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 bg-gray-900/90 border border-primary/20 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-semibold">Tổng doanh thu thực tế</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
              {Number(data.totalRevenue || 0).toLocaleString("vi-VN")} ₫
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CircleDollarSign className="w-7 h-7" />
          </div>
        </div>

        <div className="p-5 bg-gray-900/90 border border-primary/20 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-semibold">Đơn vé đã thanh toán</p>
            <p className="text-2xl font-bold text-white mt-1 font-mono">
              {data.totalConfirmedBookings || 0} đơn
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Ticket className="w-7 h-7" />
          </div>
        </div>

        <div className="p-5 bg-gray-900/90 border border-primary/20 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-semibold">Giá trị trung bình / đơn</p>
            <p className="text-2xl font-bold text-primary mt-1 font-mono">
              {Number(data.avgTicketValue || 0).toLocaleString("vi-VN")} ₫
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <TrendingUp className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Biểu đồ doanh thu 7 ngày */}
      <div className="bg-gray-900/80 rounded-2xl border border-primary/20 p-6 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-6">
          <Calendar className="w-4 h-4 text-primary" /> Doanh Thu 7 Ngày Gần Nhất
        </h3>
        <RevenueChart items={dailyRevenue} />
      </div>

      {/* 2 Cột: Top Phim & Doanh Thu Theo Rạp */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Phim */}
        <div className="bg-gray-900/80 rounded-2xl border border-primary/20 p-6 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
            <Film className="w-4 h-4 text-primary" /> Top 5 Phim Đạt Doanh Thu Cao Nhất
          </h3>
          <div className="space-y-4">
            {data.topMovies && data.topMovies.length > 0 ? (
              data.topMovies.map((m, idx) => {
                const percent = data.totalRevenue > 0 ? Math.round((m.revenue / data.totalRevenue) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-white truncate max-w-xs">{idx + 1}. {m.movieTitle}</span>
                      <span className="font-mono text-emerald-400 font-bold">{Number(m.revenue).toLocaleString("vi-VN")} ₫</span>
                    </div>
                    <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className="h-full bg-primary rounded-full transition-all duration-500"
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 text-xs py-4 text-center">Chưa có dữ liệu phim.</p>
            )}
          </div>
        </div>

        {/* Doanh thu theo Rạp */}
        <div className="bg-gray-900/80 rounded-2xl border border-primary/20 p-6 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-primary" /> Doanh Thu Theo Cụm Rạp
          </h3>
          <div className="space-y-4">
            {data.cinemaRevenue && data.cinemaRevenue.length > 0 ? (
              data.cinemaRevenue.map((c, idx) => {
                const percent = data.totalRevenue > 0 ? Math.round((c.revenue / data.totalRevenue) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-white">{c.cinemaName}</span>
                      <span className="font-mono text-white font-bold">{Number(c.revenue).toLocaleString("vi-VN")} ₫ ({percent}%)</span>
                    </div>
                    <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 text-xs py-4 text-center">Chưa có doanh thu theo rạp.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
