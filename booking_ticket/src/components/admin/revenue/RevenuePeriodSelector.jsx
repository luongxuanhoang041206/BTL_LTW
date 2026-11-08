import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  PERIODS, canShiftWeek, maxMonth, maxQuarter, selectMonth, selectPeriod, selectQuarter,
  selectYear, selectionLabel, shiftWeek, toUtcDate, vietnamToday, weekRangeLabel, yearOptions,
} from "../../../lib/revenuePeriods";

const selectClass = "h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-primary disabled:opacity-50";
const navButtonClass = "rounded-lg border border-slate-700 p-2 text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40";

export function RevenuePeriodSelector({ selection, onChange, disabled = false, today = vietnamToday() }) {
  const currentYear = toUtcDate(today).getUTCFullYear();
  const months = Array.from({ length: maxMonth(selection.year, today) }, (_, index) => index + 1);
  const quarters = Array.from({ length: maxQuarter(selection.year, today) }, (_, index) => index + 1);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Kỳ báo cáo">
        {PERIODS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            disabled={disabled}
            aria-pressed={selection.period === tab.key}
            onClick={() => onChange(selectPeriod(selection, tab.key, today))}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
              selection.period === tab.key
                ? "border-primary bg-primary text-white"
                : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500">{selectionLabel(selection)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {selection.period === "week" ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={navButtonClass}
              disabled={disabled || !canShiftWeek(selection, -1, today)}
              onClick={() => onChange(shiftWeek(selection, -1, today))}
              aria-label="Tuần trước"
              title="Tuần trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[190px] text-center text-sm font-medium text-slate-200">
              {weekRangeLabel(selection.weekStart)}
            </span>
            <button
              type="button"
              className={navButtonClass}
              disabled={disabled || !canShiftWeek(selection, 1, today)}
              onClick={() => onChange(shiftWeek(selection, 1, today))}
              aria-label="Tuần sau"
              title="Tuần sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            {selection.period === "month" && (
              <label className="flex items-center gap-2 text-xs text-slate-400">
                Tháng
                <select
                  className={selectClass}
                  disabled={disabled}
                  value={selection.month}
                  onChange={(event) => onChange(selectMonth(selection, Number(event.target.value)))}
                >
                  {months.map((month) => <option key={month} value={month}>Tháng {month}</option>)}
                </select>
              </label>
            )}
            {selection.period === "quarter" && (
              <label className="flex items-center gap-2 text-xs text-slate-400">
                Quý
                <select
                  className={selectClass}
                  disabled={disabled}
                  value={selection.quarter}
                  onChange={(event) => onChange(selectQuarter(selection, Number(event.target.value)))}
                >
                  {quarters.map((quarter) => <option key={quarter} value={quarter}>Quý {quarter}</option>)}
                </select>
              </label>
            )}
            <label className="flex items-center gap-2 text-xs text-slate-400">
              Năm
              <select
                className={selectClass}
                disabled={disabled}
                value={selection.year}
                onChange={(event) => onChange(selectYear(selection, Number(event.target.value), today))}
              >
                {yearOptions(currentYear).map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
          </>
        )}
      </div>
    </section>
  );
}