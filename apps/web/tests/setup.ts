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

// jsdom has no canvas; make getContext return null quietly so capability probes report "no WebGL".
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = () => null;
}

// jsdom lacks IntersectionObserver (motion's useInView); treat everything as in view.
if (typeof globalThis.IntersectionObserver === 'undefined') {
  class IO {
    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds: readonly number[] = [];
    private readonly cb: IntersectionObserverCallback;
    constructor(cb: IntersectionObserverCallback) {
      this.cb = cb;
    }
    observe(target: Element) {
      this.cb([{ isIntersecting: true, target } as IntersectionObserverEntry], this);
    }
    unobserve() {
      /* noop */
    }
    disconnect() {
      /* noop */
    }
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  globalThis.IntersectionObserver = IO;
}
