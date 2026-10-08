/**
 * Capability gate for the WebGL layer (design.md §5):
 *   webgl2 && hardwareConcurrency >= 4 && !prefers-reduced-motion && !saveData
 * Memoised per page load. Never throws; returns false on the server.
 */

let cached: boolean | null = null;

interface NavigatorWithConnection extends Navigator {
  connection?: { saveData?: boolean };
}

export interface CapabilityReport {
  webgl2: boolean;
  cores: number;
  reducedMotion: boolean;
  saveData: boolean;
  ok: boolean;
}

export function probeCapabilities(): CapabilityReport {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { webgl2: false, cores: 0, reducedMotion: false, saveData: false, ok: false };
  }
  let webgl2 = false;
  try {
    const canvas = document.createElement('canvas');
    webgl2 = canvas.getContext('webgl2') !== null;
  } catch {
    webgl2 = false;
  }
  const cores = navigator.hardwareConcurrency || 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = (navigator as NavigatorWithConnection).connection?.saveData === true;
  const ok = webgl2 && cores >= 4 && !reducedMotion && !saveData;
  return { webgl2, cores, reducedMotion, saveData, ok };
}

/** Whether to mount R3F scenes (RouterField, RouterOrb). */
export function canUseWebGL(): boolean {
  if (cached !== null) return cached;
  cached = probeCapabilities().ok;
  return cached;
}

/** Test hook / manual override (e.g. a "disable effects" toggle). */
export function resetCapabilityCache(): void {
  cached = null;
}

/** Device pixel ratio cap for R3F canvases (design.md §5). */
export const MAX_DPR = 1.5;
