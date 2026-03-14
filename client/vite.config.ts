import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:3000';

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 8080,
      strictPort: true,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/screenshots': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
})
