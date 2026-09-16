const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5080";

export const api = {
  baseUrl: API_BASE,

  async request(path, options = {}) {
    const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    const config = {
      ...options,
      headers,
      credentials: "include", // Cần thiết để gửi và nhận Session Cookie
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage = data?.message || `Lỗi yêu cầu: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${options.method || "GET"} ${path}]:`, error);
      throw error;
    }
  },

  get(path) {
    return this.request(path, { method: "GET" });
  },

  post(path, body) {
    return this.request(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  put(path, body) {
    return this.request(path, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  delete(path) {
    return this.request(path, { method: "DELETE" });
  },
};
