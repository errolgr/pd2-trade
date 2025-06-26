import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "path";
// @ts-ignore
import tailwindcss from '@tailwindcss/vite'

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [
      tailwindcss(),

      react()
  ],


  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      usePolling: true,
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
    proxy: {
      '/api': {
        target: 'https://api.projectdiablo2.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
}));
