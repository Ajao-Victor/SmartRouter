'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { MotionConfig, useReducedMotion } from 'motion/react';

export interface ReducedMotionContextValue {
  /** True when any source asks for reduced motion: OS setting, Save-Data, or the app toggle. */
  reduced: boolean;
  /** OS `prefers-reduced-motion: reduce`. */
  system: boolean;
  /** `navigator.connection.saveData`. */
  saveData: boolean;
  /** App-level override (Settings toggle; wired to uiStore in Task 5). */
  forced: boolean;
}

const ReducedMotionContext = createContext<ReducedMotionContextValue>({
  reduced: false,
  system: false,
  saveData: false,
  forced: false,
});

interface NavigatorWithConnection extends Navigator {
  connection?: { saveData?: boolean };
}

function readSaveData(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (navigator as NavigatorWithConnection).connection?.saveData === true;
}

export interface ReducedMotionProviderProps {
  children: React.ReactNode;
  /** Force reduced motion regardless of system settings. */
  forceReduced?: boolean;
}

/**
 * Single source of truth for "should this animate?".
 * - Server render and first client paint assume full motion is *off* only if forced,
 *   then adopt the OS/Save-Data values after mount (no hydration mismatch).
 * - Wraps the tree in `MotionConfig reducedMotion="user"` so Framer also strips
 *   transform/layout animations when the OS asks.
 */
export function ReducedMotionProvider({ children, forceReduced = false }: ReducedMotionProviderProps) {
  const systemPref = useReducedMotion();
  const [saveData, setSaveData] = useState(false);

  useEffect(() => {
    setSaveData(readSaveData());
  }, []);

  const value = useMemo<ReducedMotionContextValue>(() => {
    const system = systemPref === true;
    return { system, saveData, forced: forceReduced, reduced: system || saveData || forceReduced };
  }, [systemPref, saveData, forceReduced]);

  return (
    <ReducedMotionContext.Provider value={value}>
      <MotionConfig reducedMotion={forceReduced ? 'always' : 'user'}>{children}</MotionConfig>
    </ReducedMotionContext.Provider>
  );
}

export function useReducedMotionContext(): ReducedMotionContextValue {
  return useContext(ReducedMotionContext);
}
