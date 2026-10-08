'use client';

import { useEffect, useState } from 'react';

import { Check, Copy, ExternalLink } from 'lucide-react';

import { isTxHash, shortHex, txUrl } from '@/lib/explorer';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';

const HEX = '0123456789abcdef';
const DURATION = 900;

/** Characters decode from random hex to the real hash over 900 ms (design.md §2). Validated before linking. */
export function TxHashReveal({ hash }: { hash: string }) {
  const reduced = useReducedMotionSafe();
  const valid = isTxHash(hash);
  const [shown, setShown] = useState(reduced || !valid ? hash : '');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (reduced || !valid) {
      setShown(hash);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / DURATION);
      const settled = Math.floor(p * hash.length);
      let out = hash.slice(0, settled);
      for (let i = settled; i < hash.length; i += 1) out += i < 2 ? hash[i] : HEX[Math.floor(Math.random() * 16)];
      setShown(out);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [hash, reduced, valid]);

  const url = txUrl(hash);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
      }, 1200);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (!valid) return <span className="num text-xs text-signal">invalid hash</span>;

  return (
    <span className="num inline-flex items-center gap-2 text-xs text-accent-2" aria-label={`Transaction ${hash}`}>
      <span className="sr-only">{hash}</span>
      <span aria-hidden="true" className="max-w-[12rem] truncate sm:max-w-none">
        {shown.length === hash.length ? shortHex(shown, 10, 8) : shown.slice(0, 20)}
      </span>
      <button
        type="button"
        aria-label="Copy transaction hash"
        onClick={() => {
          void copy();
        }}
        className="hit-44 -m-2 inline-flex items-center justify-center rounded-pill text-text-2 hocus:text-text-0"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" aria-label="View on Tempo explorer" className="text-text-2 hocus:text-accent-2">
          <ExternalLink size={14} />
        </a>
      )}
    </span>
  );
}
