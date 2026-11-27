import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

configure({ asyncUtilTimeout: 5000 });
window.scrollTo = () => {};

localStorage.clear();

// jsdom does not implement window.matchMedia. Polyfill it so components that
// call matchMedia() (e.g. usePrefersReducedMotion) work in tests.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// No test may reach a real API: by default every fetch fails, so the dashboard sees the API as offline.
// A test that needs the API online stubs fetch itself (vi.stubGlobal('fetch', ...)).
globalThis.fetch = (() =>
  Promise.reject(new TypeError('Network is disabled in tests'))) as typeof fetch;
