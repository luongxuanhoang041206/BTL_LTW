import { Building2, Film } from "lucide-react";
import { formatVnd } from "../../../lib/revenuePeriods";

function shareOf(revenue, totalRevenue) {
  return totalRevenue > 0 ? Math.round((Number(revenue) / Number(totalRevenue)) * 100) : 0;
}

function BreakdownCard({ icon: Icon, title, children }) {
  return (
    <section className="rounded-2xl border border-primary/20 bg-gray-900/80 p-6 shadow-xl">
      <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-white">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function ShareBar({ percent, barClass }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
      <div
        style={{ width: `${percent}%` }}
        className={`h-full rounded-full transition-all duration-500 ${barClass}`}
      />
    </div>
  );
}

function EmptyRow({ text }) {
  return <p className="py-4 text-center text-xs text-gray-500">{text}</p>;
}

function SkeletonRows() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <div key={row} className="space-y-1.5">
          <div className="h-4 w-full animate-pulse rounded bg-slate-800" />
          <div className="h-2 w-full animate-pulse rounded-full bg-slate-800" />
        </div>
      ))}
    </div>
  );
}

export function RevenueBreakdown({ topMovies = [], cinemaRevenue = [], totalRevenue = 0, loading = false }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <BreakdownCard icon={Film} title="Top 5 Phim Đạt Doanh Thu Cao Nhất">
        {loading ? <SkeletonRows /> : topMovies.length > 0 ? topMovies.map((movie, index) => (
          <div key={`${movie.movieTitle}-${index}`} className="space-y-1.5">
            <div className="flex justify-between gap-3 text-xs">
              <span className="max-w-xs truncate font-semibold text-white">
                {index + 1}. {movie.movieTitle}
              </span>
              <span className="shrink-0 font-mono font-bold text-emerald-400">{formatVnd(movie.revenue)}</span>
            </div>
            <ShareBar percent={shareOf(movie.revenue, totalRevenue)} barClass="bg-primary" />
          </div>
        )) : <EmptyRow text="Chưa có dữ liệu phim trong kỳ này." />}
      </BreakdownCard>

      <BreakdownCard icon={Building2} title="Doanh Thu Theo Cụm Rạp">
        {loading ? <SkeletonRows /> : cinemaRevenue.length > 0 ? cinemaRevenue.map((cinema, index) => {
          const percent = shareOf(cinema.revenue, totalRevenue);
          return (
            <div key={`${cinema.cinemaName}-${index}`} className="space-y-1.5">
              <div className="flex justify-between gap-3 text-xs">
                <span className="truncate font-semibold text-white">{cinema.cinemaName}</span>
                <span className="shrink-0 font-mono font-bold text-white">
                  {formatVnd(cinema.revenue)} ({percent}%)
                </span>
              </div>
              <ShareBar percent={percent} barClass="bg-blue-500" />
            </div>
          );
        }) : <EmptyRow text="Chưa có doanh thu theo rạp trong kỳ này." />}
      </BreakdownCard>
    </div>
  );
}