import { create } from 'zustand';

export interface Trail {
  id: string;
  d: string;
  color: 'accent' | 'teal' | 'free';
}

export interface BurstOptions {
  x: number;
  y: number;
  /** CSS colour. */
  color?: string;
  /** ≤ 120 (design.md §5). */
  count?: number;
}

interface FxState {
  trails: Trail[];
  addTrail: (trail: Omit<Trail, 'id'>) => string;
  removeTrail: (id: string) => void;
  burstHandler: ((opts: BurstOptions) => void) | null;
  setBurstHandler: (fn: ((opts: BurstOptions) => void) | null) => void;
}

let counter = 0;

/** Imperative FX bus: GlowTrail paths and the ParticleBurst canvas handler. */
export const useFxStore = create<FxState>()((set) => ({
  trails: [],
  addTrail: (trail) => {
    counter += 1;
    const id = `trail${String(counter)}`;
    set((s) => ({ trails: [...s.trails.slice(-3), { ...trail, id }] }));
    return id;
  },
  removeTrail: (id) => {
    set((s) => ({ trails: s.trails.filter((t) => t.id !== id) }));
  },
  burstHandler: null,
  setBurstHandler: (fn) => {
    set({ burstHandler: fn });
  },
}));
