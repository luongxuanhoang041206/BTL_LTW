import { useState } from "react";
import { formatAxisValue, formatDayMonth, formatVnd } from "../../../lib/revenuePeriods";

const BASE_WIDTH = 760;
const CHART_HEIGHT = 280;
const MARGIN = { top: 24, right: 20, bottom: 52, left: 82 };
// Bề rộng tối thiểu mỗi cột để nhãn ngày không chồng lên nhau; tháng 31 cột sẽ cuộn ngang.
const MIN_BAND = 34;
const TOOLTIP_HEIGHT = 46;

function niceAxisMaximum(peak) {
  const rawStep = peak > 0 ? peak / 4 : 1;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = factor * magnitude;
  return Math.max(step, Math.ceil(peak / step) * step);
}

export function RevenueTrendChart({ items, period }) {
  const [activeIndex, setActiveIndex] = useState(null);

  if (!Array.isArray(items) || items.length === 0) {
    return <p className="py-12 text-center text-sm text-slate-400">Chưa có dữ liệu doanh thu.</p>;
  }

  const values = items.map((item) => Number(item.revenue));
  if (values.some((value) => !Number.isFinite(value))) {
    return (
      <p className="py-12 text-center text-sm text-rose-300" role="alert">
        Dữ liệu doanh thu không hợp lệ.
      </p>
    );
  }

  const chartWidth = Math.max(BASE_WIDTH, MARGIN.left + MARGIN.right + items.length * MIN_BAND);
  const plotWidth = chartWidth - MARGIN.left - MARGIN.right;
  const plotHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
  const baseline = MARGIN.top + plotHeight;
  const bandWidth = plotWidth / items.length;
  const barWidth = Math.min(42, bandWidth * 0.58);
  const axisMaximum = niceAxisMaximum(Math.max(...values));

  const active = activeIndex === null ? null : items[activeIndex];
  let tooltip = null;
  if (active) {
    const title = period === "week"
      ? `${active.label || "Ngày"} · ${formatDayMonth(active.date)}`
      : active.label || formatDayMonth(active.date);
    const amount = formatVnd(values[activeIndex]);
    const width = Math.min(240, Math.max(140, Math.max(title.length, amount.length) * 6.8 + 24));
    const centerX = MARGIN.left + bandWidth * (activeIndex + 0.5);
    const barHeight = (values[activeIndex] / axisMaximum) * plotHeight;
    tooltip = {
      title,
      amount,
      width,
      x: Math.min(Math.max(centerX - width / 2, MARGIN.left), chartWidth - MARGIN.right - width),
      y: Math.max(MARGIN.top, baseline - barHeight - TOOLTIP_HEIGHT - 8),
    };
  }

  return (
    <div className="admin-chart-scroll">
      <svg
        className="admin-revenue-chart"
        style={chartWidth > BASE_WIDTH ? { minWidth: `${chartWidth}px` } : undefined}
        viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}
        preserveAspectRatio="xMinYMid meet"
        role="img"
        aria-labelledby="revenue-chart-title revenue-chart-description"
        onMouseLeave={() => setActiveIndex(null)}
      >
        <title id="revenue-chart-title">Doanh thu theo kỳ báo cáo</title>
        <desc id="revenue-chart-description">
          Biểu đồ cột doanh thu, đơn vị đồng Việt Nam. Giá trị 0 được hiển thị bằng chấm trên trục đáy.
        </desc>
        <text x={MARGIN.left} y="14" className="admin-chart-unit">Doanh thu (₫)</text>

        {Array.from({ length: 5 }, (_, index) => {
          const value = (axisMaximum / 4) * index;
          const y = baseline - (value / axisMaximum) * plotHeight;
          return (
            <g key={index}>
              <line
                x1={MARGIN.left}
                x2={chartWidth - MARGIN.right}
                y1={y}
                y2={y}
                className="admin-chart-gridline"
              />
              <text x={MARGIN.left - 10} y={y + 4} textAnchor="end" className="admin-chart-axis-label">
                {formatAxisValue(value)}
              </text>
            </g>
          );
        })}

        {items.map((item, index) => {
          const value = values[index];
          const centerX = MARGIN.left + bandWidth * (index + 0.5);
          const barHeight = (value / axisMaximum) * plotHeight;
          const label = item.label || formatDayMonth(item.date);
          const isActive = activeIndex === index;
          return (
            <g key={`${item.date}-${index}`}>
              {value > 0 ? (
                <rect
                  x={centerX - barWidth / 2}
                  y={baseline - barHeight}
                  width={barWidth}
                  height={barHeight}
                  rx="3"
                  className={`admin-chart-bar${isActive ? " is-active" : ""}`}
                />
              ) : (
                <circle
                  cx={centerX}
                  cy={baseline}
                  r="4"
                  className={`admin-chart-zero${isActive ? " is-active" : ""}`}
                />
              )}
              <text x={centerX} y={baseline + 22} textAnchor="middle" className="admin-chart-axis-label">
                {label}
              </text>
            </g>
          );
        })}

        {items.map((item, index) => (
          <rect
            key={`hit-${item.date}-${index}`}
            x={MARGIN.left + bandWidth * index}
            y={MARGIN.top}
            width={bandWidth}
            height={plotHeight}
            fill="transparent"
            className="admin-chart-hit"
            tabIndex="0"
            aria-label={`${item.label || formatDayMonth(item.date)}: ${formatVnd(values[index])}`}
            onMouseEnter={() => setActiveIndex(index)}
            onFocus={() => setActiveIndex(index)}
            onBlur={() => setActiveIndex(null)}
          />
        ))}

        {tooltip && (
          <g className="admin-chart-tooltip" pointerEvents="none" transform={`translate(${tooltip.x} ${tooltip.y})`}>
            <rect width={tooltip.width} height={TOOLTIP_HEIGHT} rx="8" />
            <text x={tooltip.width / 2} y="18" textAnchor="middle" className="admin-chart-tooltip-title">
              {tooltip.title}
            </text>
            <text x={tooltip.width / 2} y="35" textAnchor="middle" className="admin-chart-tooltip-value">
              {tooltip.amount}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}