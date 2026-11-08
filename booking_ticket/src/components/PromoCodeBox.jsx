import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Tag, X, ChevronDown, Loader2 } from "lucide-react";
import {
  getAvailablePromotions,
  previewPromotion,
  describePromotion,
  formatVnd,
} from "../lib/promotionApi";

// Ô nhập + áp dụng mã giảm giá cho giỏ hàng hiện tại.
// onAppliedChange(result|null): báo cho trang cha kết quả preview mới nhất
// (đã được backend xác nhận) để hiển thị tóm tắt và gửi khi checkout.
export function PromoCodeBox({
  ticketsAmount,
  foodsAmount,
  combosAmount,
  applied,
  onAppliedChange,
  enabled = true,
}) {
  const { t } = useTranslation();
  const [code, setCode] = useState(applied?.code || "");
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [available, setAvailable] = useState([]);
  const [showList, setShowList] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const loadingList = enabled && !loaded;

  const appliedCodeRef = useRef(applied?.code || null);
  useEffect(() => {
    appliedCodeRef.current = applied?.code || null;
  }, [applied?.code]);

  // Tải danh sách mã khả dụng khi khách đã đăng nhập.
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    getAvailablePromotions()
      .then((list) => {
        if (!cancelled) setAvailable(list);
      })
      .catch(() => {
        if (!cancelled) setAvailable([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // Giỏ hàng thay đổi → preview lại mã đang áp dụng (debounce) để số tiền luôn đúng.
  useEffect(() => {
    const currentCode = appliedCodeRef.current;
    if (!currentCode) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const result = await previewPromotion({
          code: currentCode,
          ticketsAmount,
          foodsAmount,
          combosAmount,
        });
        if (!cancelled) {
          onAppliedChange(result);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          onAppliedChange(null);
          setError(err.message || t("promo.errNotValid"));
        }
      }
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [ticketsAmount, foodsAmount, combosAmount, onAppliedChange, t]);

  const handleApply = useCallback(
    async (codeToApply) => {
      const trimmed = (codeToApply ?? code).trim();
      if (!trimmed) {
        setError(t("promo.errEnterCode"));
        return;
      }
      if (applying) return;
      setApplying(true);
      setError("");
      try {
        const result = await previewPromotion({
          code: trimmed,
          ticketsAmount,
          foodsAmount,
          combosAmount,
        });
        setCode(result.code);
        onAppliedChange(result);
      } catch (err) {
        onAppliedChange(null);
        setError(err.message || t("promo.errInvalid"));
      } finally {
        setApplying(false);
      }
    },
    [code, applying, ticketsAmount, foodsAmount, combosAmount, onAppliedChange, t]
  );

  const handleRemove = useCallback(() => {
    setCode("");
    setError("");
    onAppliedChange(null);
  }, [onAppliedChange]);

  return (
    <div className="mt-5 border-t border-white/10 pt-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
        <Tag className="h-4 w-4 text-primary" />
        {t("promo.title")}
      </div>

      {applied ? (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate font-mono text-sm font-bold text-emerald-300">
              {applied.code}
            </p>
            <p className="text-xs text-emerald-200/80">
              {t("promo.discount", { amount: formatVnd(applied.discountAmount) })}
            </p>
          </div>
          <button
            onClick={handleRemove}
            aria-label={t("promo.remove")}
            className="shrink-0 rounded-full p-1 text-emerald-300 hover:bg-emerald-500/20 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              if (error) setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleApply();
              }
            }}
            placeholder={t("promo.placeholder")}
            maxLength={30}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-primary focus:outline-none"
          />
          <button
            onClick={() => handleApply()}
            disabled={applying || !code.trim()}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 hover:bg-primary-dull transition"
          >
            {applying && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("promo.apply")}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      {enabled && (
        <div className="mt-3">
          <button
            onClick={() => setShowList((v) => !v)}
            className="flex w-full items-center justify-between text-xs text-gray-400 hover:text-gray-200 transition"
          >
            <span>{t("promo.availableTitle")}</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showList ? "rotate-180" : ""}`}
            />
          </button>

          {showList && (
            <div className="mt-2 space-y-2">
              {loadingList && (
                <p className="text-xs text-gray-500">{t("promo.loading")}</p>
              )}
              {!loadingList && available.length === 0 && (
                <p className="text-xs text-gray-500">{t("promo.none")}</p>
              )}
              {!loadingList &&
                available.map((promo) => (
                  <div
                    key={promo.code}
                    className="rounded-lg border border-white/10 bg-gray-800/60 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-bold text-primary">
                        {promo.code}
                      </span>
                      <button
                        onClick={() => handleApply(promo.code)}
                        disabled={applying}
                        className="shrink-0 rounded-md border border-primary/40 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-50 transition"
                      >
                        {t("promo.use")}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {describePromotion(promo, t)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-500">
                      {t("promo.expiry", { date: promo.endDate })}
                      {promo.remainingUses != null && t("promo.remainingUses", { count: promo.remainingUses })}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}