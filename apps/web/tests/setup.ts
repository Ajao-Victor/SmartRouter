import '@testing-library/jest-dom/vitest';

// jsdom lacks matchMedia; motion/react and reduced-motion hooks query it.
const w = globalThis as { matchMedia?: typeof window.matchMedia };
if (!w.matchMedia) {
  w.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
