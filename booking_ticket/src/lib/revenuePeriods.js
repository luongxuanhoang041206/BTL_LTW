const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";
const DAY_MS = 86_400_000;
const YEAR_SPAN = 5;

export const PERIODS = [
  { key: "week", label: "Tuần" },
  { key: "month", label: "Tháng" },
  { key: "quarter", label: "Quý" },
  { key: "year", label: "Năm" },
];

const CHART_TITLES = {
  week: "Doanh Thu Theo Ngày Trong Tuần",
  month: "Doanh Thu Theo Ngày Trong Tháng",
  quarter: "Doanh Thu Theo Tháng Trong Quý",
  year: "Doanh Thu Theo Tháng Trong Năm",
};

const vietnamDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: VIETNAM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Mọi phép tính ngày dùng mốc UTC để không lệch theo múi giờ/DST của trình duyệt.
export function toUtcDate(iso) {
  const [year, month, day] = String(iso).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toIso(date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

export function addDays(iso, days) {
  return toIso(new Date(toUtcDate(iso).getTime() + days * DAY_MS));
}

export function mondayOf(iso) {
  return addDays(iso, -((toUtcDate(iso).getUTCDay() + 6) % 7));
}

export function vietnamToday(now = new Date()) {
  const parts = vietnamDateFormatter.formatToParts(now);
  const value = (type) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function createInitialSelection(now = new Date()) {
  const today = vietnamToday(now);
  const [year, month] = today.split("-").map(Number);
  return {
    period: "week",
    year,
    month,
    quarter: Math.floor((month - 1) / 3) + 1,
    weekStart: mondayOf(today),
  };
}

export function yearOptions(currentYear) {
  return Array.from({ length: YEAR_SPAN + 1 }, (_, index) => currentYear - index);
}

export function earliestWeekStart(currentYear) {
  return mondayOf(`${currentYear - YEAR_SPAN}-01-01`);
}

export function maxMonth(year, today) {
  const [currentYear, currentMonth] = today.split("-").map(Number);
  return year < currentYear ? 12 : currentMonth;
}

export function maxQuarter(year, today) {
  return Math.ceil(maxMonth(year, today) / 3);
}

function clampSelection(selection, today) {
  const currentMonday = mondayOf(today);
  const floor = earliestWeekStart(toUtcDate(today).getUTCFullYear());
  const weekStart = mondayOf(selection.weekStart);
  return {
    ...selection,
    month: Math.min(selection.month, maxMonth(selection.year, today)),
    quarter: Math.min(selection.quarter, maxQuarter(selection.year, today)),
    weekStart: weekStart > currentMonday ? currentMonday : weekStart < floor ? floor : weekStart,
  };
}

export function selectPeriod(selection, period, today) {
  if (selection.period === period) return selection;
  return clampSelection({ ...selection, period }, today);
}

export function selectYear(selection, year, today) {
  if (selection.year === year) return selection;
  return clampSelection({ ...selection, year }, today);
}

export function selectMonth(selection, month) {
  return selection.month === month ? selection : { ...selection, month };
}

export function selectQuarter(selection, quarter) {
  return selection.quarter === quarter ? selection : { ...selection, quarter };
}

export function shiftWeek(selection, weeks, today) {
  const currentMonday = mondayOf(today);
  const floor = earliestWeekStart(toUtcDate(today).getUTCFullYear());
  const target = addDays(selection.weekStart, weeks * 7);
  const weekStart = target > currentMonday ? currentMonday : target < floor ? floor : target;
  return weekStart === selection.weekStart ? selection : { ...selection, weekStart };
}

export function canShiftWeek(selection, weeks, today) {
  return shiftWeek(selection, weeks, today) !== selection;
}

export function selectionToParams(selection) {
  switch (selection.period) {
    case "month":
      return { period: "month", year: selection.year, month: selection.month };
    case "quarter":
      return { period: "quarter", year: selection.year, quarter: selection.quarter };
    case "year":
      return { period: "year", year: selection.year };
    default:
      return { period: "week", weekStart: selection.weekStart };
  }
}

export function chartTitle(period) {
  return CHART_TITLES[period] ?? CHART_TITLES.week;
}

export function formatVnd(value) {
  return `${Number(value ?? 0).toLocaleString("vi-VN")} ₫`;
}

export function formatAxisValue(value) {
  return Number(value ?? 0).toLocaleString("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

export function formatDayMonth(iso) {
  const match = String(iso ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}` : String(iso ?? "") || "—";
}

export function formatDateRange(startIso, endExclusiveIso) {
  const format = (iso) => {
    const match = String(iso ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : String(iso ?? "") || "—";
  };
  return `${format(startIso)} – ${format(addDays(endExclusiveIso, -1))}`;
}

export function weekRangeLabel(weekStart) {
  const sunday = addDays(weekStart, 6);
  const year = toUtcDate(sunday).getUTCFullYear();
  return `${formatDayMonth(weekStart)} – ${formatDayMonth(sunday)}/${year}`;
}

export function selectionLabel(selection) {
  switch (selection.period) {
    case "month":
      return `Tháng ${selection.month}/${selection.year}`;
    case "quarter":
      return `Quý ${selection.quarter}/${selection.year}`;
    case "year":
      return `Năm ${selection.year}`;
    default:
      return `Tuần ${weekRangeLabel(selection.weekStart)}`;
  }
}