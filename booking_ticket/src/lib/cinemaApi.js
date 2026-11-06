import { api } from "./api";

export function getAdminCinemas(filters = {}) {
  const query = new URLSearchParams();
  const supportedFilters = ["city", "keyword", "status", "page", "pageSize"];

  supportedFilters.forEach((key) => {
    const value = filters[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      query.set(key, String(value).trim());
    }
  });

  const queryString = query.toString();
  return api.get(`/api/admin/cinemas${queryString ? `?${queryString}` : ""}`);
}

export function getAdminCinemaRecords(response) {
  if (Array.isArray(response?.data)) return response.data;
  return Array.isArray(response) ? response : [];
}

export function getAdminCinemaDetail(id) {
  return api.get(`/api/admin/cinemas/${id}`);
}
