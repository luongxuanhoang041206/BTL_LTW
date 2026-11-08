import { useTranslation } from "react-i18next";

export function Loading() {
  const { t } = useTranslation();
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true"></span>
      <span className="sr-only">{t("common.loadingData")}</span>
    </div>
  );
}
