import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
const pages = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  base: pages ? '/haunted-audit/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: true,
    // Proxy API calls to the FastAPI backend during development
    proxy: {
      '/runs': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});
