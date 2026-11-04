import { api } from "./api";
import { getAdminCinemas } from "./cinemaApi";

function queryString(values) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      query.set(key, String(value).trim());
    }
  });
  return query.toString();
}

export function getAdminShowtimes(filters) {
  const query = queryString(filters);
  return api.get(`/api/admin/shows${query ? `?${query}` : ""}`);
}

export function getShowtimeCalendar(filters) {
  const query = queryString(filters);
  return api.get(`/api/admin/showtimes/calendar?${query}`);
}

export function getAdminShowtime(id) {
  return api.get(`/api/admin/showtimes/${id}`);
}

export function createShowtime(payload) {
  return api.post("/api/admin/shows", payload);
}

export function updateShowtime(id, payload) {
  return api.patch(`/api/admin/shows/${id}`, payload);
}

export function cancelShowtime(id) {
  return api.patch(`/api/admin/showtimes/${id}/cancel`);
}

export function completeShowtime(id) {
  return api.patch(`/api/admin/showtimes/${id}/complete`);
}

export async function getShowtimeCatalogs() {
  const [firstCinemaPage, roomsResponse] = await Promise.all([
    getAdminCinemas({ page: 1, pageSize: 100 }),
    api.get("/api/admin/rooms"),
  ]);

  const cinemas = Array.isArray(firstCinemaPage?.data) ? [...firstCinemaPage.data] : [];
  const cinemaPages = Number(firstCinemaPage?.totalPages) || 1;
  for (let page = 2; page <= cinemaPages; page += 1) {
    const response = await getAdminCinemas({ page, pageSize: 100 });
    if (Array.isArray(response?.data)) cinemas.push(...response.data);
  }

  // The Admin movie endpoint returns ten records per page and has no page-size parameter.
  const movies = [];
  for (let page = 1; page <= 100; page += 1) {
    const pageItems = await api.get(`/api/admin/movies?page=${page}`);
    const items = Array.isArray(pageItems) ? pageItems : [];
    movies.push(...items);
    if (items.length < 10) break;
  }

  return {
    cinemas,
    rooms: Array.isArray(roomsResponse) ? roomsResponse : [],
    movies,
  };
}
