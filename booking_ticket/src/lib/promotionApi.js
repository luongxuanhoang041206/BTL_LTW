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

// Mô tả ngắn điều kiện mã để hiển thị cho khách hàng.
export function describePromotion(promo) {
  const parts = [];
  parts.push(
    promo.discountType === "fixed"
      ? `Giảm ${formatVnd(promo.discountValue)}`
      : `Giảm ${Number(promo.discountValue)}%`
  );
  parts.push(scopeLabel(promo.promotionScope));
  if (Number(promo.minOrderAmount) > 0) {
    parts.push(`Đơn tối thiểu ${formatVnd(promo.minOrderAmount)}`);
  }
  if (promo.maxDiscountAmount != null && Number(promo.maxDiscountAmount) > 0) {
    parts.push(`Giảm tối đa ${formatVnd(promo.maxDiscountAmount)}`);
  }
  return parts.join(" · ");
}