'use client';

import { useEffect, useState } from 'react';

import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';

/** Types text in at `ms` per character; instant under reduced motion. */
export function TypeLine({ text, ms = 12, className }: { text: string; ms?: number; className?: string }) {
  const reduced = useReducedMotionSafe();
  const [n, setN] = useState(reduced ? text.length : 0);
  useEffect(() => {
    if (reduced) {
      setN(text.length);
      return;
    }
    setN(0);
    let i = 0;
    const t = window.setInterval(() => {
      i += 1;
      setN(i);
      if (i >= text.length) window.clearInterval(t);
    }, ms);
    return () => {
      window.clearInterval(t);
    };
  }, [text, ms, reduced]);
  return (
    <span className={className} aria-label={text}>
      {text.slice(0, n)}
    </span>
  );
}
