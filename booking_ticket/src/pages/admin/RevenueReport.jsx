import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BarChart3, Calendar, LoaderCircle, RotateCcw } from "lucide-react";
import { Title } from "../../components/admin/Title";
import { RevenuePeriodSelector } from "../../components/admin/revenue/RevenuePeriodSelector";
import { RevenueSummaryCards } from "../../components/admin/revenue/RevenueSummaryCards";
import { RevenueTrendChart } from "../../components/admin/revenue/RevenueTrendChart";
import { RevenueBreakdown } from "../../components/admin/revenue/RevenueBreakdown";
import { getRevenueReport, revenueQueryString } from "../../lib/revenueApi";
import { chartTitle, createInitialSelection, formatDateRange, vietnamToday } from "../../lib/revenuePeriods";

export function RevenueReport() {
  const today = vietnamToday();
  const [selection, setSelection] = useState(createInitialSelection);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ key: "", data: null, error: "" });

  // Lựa chọn không đổi -> query string không đổi -> effect không chạy lại, nên không gọi API trùng.
  const queryString = useMemo(() => revenueQueryString(selection), [selection]);
  const requestKey = `${queryString}#${attempt}`;
  // Suy ra từ khoá của kết quả đang giữ thay vì setState trong effect: đổi kỳ là hiện loading ngay, không nhấp nháy.
  const loading = result.key !== requestKey;
  const data = result.data;
  const error = loading ? "" : result.error;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    getRevenueReport(queryString, { signal: controller.signal })
      .then((response) => {
        if (active) setResult({ key: requestKey, data: response, error: "" });
      })
      .catch((err) => {
        if (!active || err.name === "AbortError") return;
        setResult({
          key: requestKey,
          data: null,
          error: err.message || "Không thể tải báo cáo doanh thu.",
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [queryString, requestKey]);

  const isEmpty = !loading && !error && data?.totalConfirmedBookings === 0;

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Title text1="Báo Cáo" text2="Doanh Thu & Tài Chính" />
        <span className="inline-flex items-center gap-2 text-xs text-gray-400">
          {loading && <LoaderCircle className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />}
          Dữ liệu thời gian thực từ cơ sở dữ liệu
        </span>
      </div>

      <RevenuePeriodSelector
        selection={selection}
        today={today}
        disabled={loading}
        onChange={setSelection}
      />

      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-300"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="min-w-[200px] flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-500/10"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Thử lại
          </button>
        </div>
      ) : (
        <>
          <RevenueSummaryCards data={loading ? null : data} />

          <section className="rounded-2xl border border-primary/20 bg-gray-900/80 p-6 shadow-xl">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-base font-bold text-white">
                <Calendar className="h-4 w-4 text-primary" /> {chartTitle(selection.period)}
              </h3>
              {!loading && data && (
                <span className="text-xs text-slate-500">{formatDateRange(data.startDate, data.endDate)}</span>
              )}
            </div>

            <div className="min-h-[280px]">
              {loading ? (
                <div className="grid min-h-[280px] place-items-center" role="status" aria-live="polite">
                  <LoaderCircle className="h-7 w-7 animate-spin text-primary" aria-hidden="true" />
                  <span className="sr-only">Đang tải biểu đồ doanh thu</span>
                </div>
              ) : isEmpty ? (
                <div className="grid min-h-[280px] place-items-center">
                  <div className="py-12 text-center">
                    <BarChart3 className="mx-auto h-9 w-9 text-slate-600" />
                    <p className="mt-3 font-medium text-white">Chưa có doanh thu trong kỳ này</p>
                    <p className="mt-1 text-sm text-slate-500">Thử chọn một kỳ báo cáo khác.</p>
                  </div>
                </div>
              ) : (
                <RevenueTrendChart items={data?.revenueTrend ?? []} period={selection.period} />
              )}
            </div>
          </section>

          <RevenueBreakdown
            loading={loading}
            topMovies={data?.topMovies ?? []}
            cinemaRevenue={data?.cinemaRevenue ?? []}
            totalRevenue={data?.totalRevenue ?? 0}
          />
        </>
      )}
    </div>
  );
}
