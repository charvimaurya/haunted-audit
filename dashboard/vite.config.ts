import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/**
 * Sample values live only in src/samples/ (no-mock-results REQ-NM-09).
 * The build fails if any app file imports that folder. Tests may import it.
 */
function noSamplesInApp(): Plugin {
  return {
    name: 'no-samples-in-app',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer) return null;
      const from = importer.replace(/\\/g, '/');
      if (from.includes('/src/test/') || from.includes('/src/samples/')) return null;
      if (/(^|\/)samples(\/|$)/.test(source)) {
        this.error(`${from} imports "${source}". Sample data may not be used by app code (src/samples/ is for tests only).`);
      }
      return null;
    },
  };
}

// https://vite.dev/config/
const pages = process.env.GITHUB_PAGES === 'true';
export default defineConfig({
  base: pages ? '/haunted-audit/' : '/',
  plugins: [noSamplesInApp(), react()],
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
