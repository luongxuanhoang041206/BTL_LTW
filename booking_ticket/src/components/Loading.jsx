export function Loading() {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true"></span>
      <span className="sr-only">Đang tải dữ liệu</span>
    </div>
  );
}
