import { api } from "./api";

// API khuyến mãi phía khách hàng. Mọi giá trị giảm giá đều do backend tính,
// frontend chỉ hiển thị kết quả preview, không tự suy diễn số tiền.

export function getAvailablePromotions() {
  return api.get("/api/promotions/available").then((data) => data.promotions || []);
}

export function previewPromotion({ code, ticketsAmount, foodsAmount, combosAmount }) {
  return api.post("/api/promotions/preview", {
    code,
    ticketsAmount,
    foodsAmount,
    combosAmount,
  });
}

export const formatVnd = (value) => `${Number(value || 0).toLocaleString("vi-VN")} ₫`;

const SCOPE_LABELS = {
  all: "Toàn bộ đơn",
  tickets: "Tiền vé",
  foods: "Đồ ăn / bắp nước",
  combos: "Combo",
};

export function scopeLabel(scope) {
  return SCOPE_LABELS[scope] || SCOPE_LABELS.all;
}

const SCOPE_KEYS = {
  all: "promo.scopeAll",
  tickets: "promo.scopeTickets",
  foods: "promo.scopeFoods",
  combos: "promo.scopeCombos",
};

// Mô tả ngắn điều kiện mã để hiển thị cho khách hàng (đa ngôn ngữ qua hàm t).
export function describePromotion(promo, t) {
  const translate = typeof t === "function" ? t : null;
  const parts = [];
  parts.push(
    promo.discountType === "fixed"
      ? translate
        ? translate("promo.discount", { amount: formatVnd(promo.discountValue) })
        : `Giảm ${formatVnd(promo.discountValue)}`
      : translate
        ? translate("promo.descPercent", { percent: Number(promo.discountValue) })
        : `Giảm ${Number(promo.discountValue)}%`
  );
  parts.push(translate ? translate(SCOPE_KEYS[promo.promotionScope] || SCOPE_KEYS.all) : scopeLabel(promo.promotionScope));
  if (Number(promo.minOrderAmount) > 0) {
    parts.push(
      translate
        ? translate("promo.descMinOrder", { amount: formatVnd(promo.minOrderAmount) })
        : `Đơn tối thiểu ${formatVnd(promo.minOrderAmount)}`
    );
  }
  if (promo.maxDiscountAmount != null && Number(promo.maxDiscountAmount) > 0) {
    parts.push(
      translate
        ? translate("promo.descMaxDiscount", { amount: formatVnd(promo.maxDiscountAmount) })
        : `Giảm tối đa ${formatVnd(promo.maxDiscountAmount)}`
    );
  }
  return parts.join(" · ");
}