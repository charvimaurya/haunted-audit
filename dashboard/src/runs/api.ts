/** API base URL for the dashboard. VITE_API_URL, default http://127.0.0.1:8000. */
const RAW_API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://127.0.0.1:8000';
export const API_BASE = RAW_API_BASE.replace(/\/+$/, '');
