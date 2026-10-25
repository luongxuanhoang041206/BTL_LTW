import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/app/" : "/",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../MovieBooking/wwwroot/app",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": "http://localhost:5080",
      "/seatHub": {
        target: "http://localhost:5080",
        ws: true,
      },
    },
  },
}));
