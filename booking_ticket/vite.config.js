
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/app/" : "/",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../MovieBooking/wwwroot/app",
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,

    // Cho phép truy cập qua Cloudflare Quick Tunnel
    allowedHosts: [".trycloudflare.com"],

    proxy: {
      "/api": {
        target: "http://localhost:5080",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:5080",
        changeOrigin: true,
      },
      "/seatHub": {
        target: "http://localhost:5080",
        changeOrigin: true,
        ws: true,
      },
    },
  },
}));
