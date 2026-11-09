import '@testing-library/jest-dom';

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
