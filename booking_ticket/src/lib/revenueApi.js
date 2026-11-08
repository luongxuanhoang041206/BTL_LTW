import { api } from "./api";
import { selectionToParams } from "./revenuePeriods";

export function revenueQueryString(selection) {
  const query = new URLSearchParams();
  Object.entries(selectionToParams(selection)).forEach(([key, value]) => query.set(key, String(value)));
  return query.toString();
}

export function getRevenueReport(queryString, options) {
  return api.get(`/api/admin/reports/revenue?${queryString}`, options);
}