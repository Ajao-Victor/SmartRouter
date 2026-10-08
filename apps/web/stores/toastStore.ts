import { create } from 'zustand';

export type ToastTone = 'info' | 'success' | 'warn' | 'error';

export interface ToastItem {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  /** ms; 0 = sticky. */
  duration: number;
}

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  duration?: number;
}

interface ToastState {
  items: ToastItem[];
  push: (input: ToastInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const MAX_VISIBLE = 4;
let counter = 0;

export const useToastStore = create<ToastState>()((set) => ({
  items: [],
  push: (input) => {
    counter += 1;
    const id = `t${String(counter)}`;
    const item: ToastItem = {
      id,
      tone: input.tone ?? 'info',
      title: input.title,
      duration: input.duration ?? 4000,
      ...(input.description ? { description: input.description } : {}),
    };
    set((s) => ({ items: [...s.items, item].slice(-MAX_VISIBLE) }));
    return id;
  },
  dismiss: (id) => {
    set((s) => ({ items: s.items.filter((t) => t.id !== id) }));
  },
  clear: () => {
    set({ items: [] });
  },
}));

/** Imperative helpers usable outside React (hooks, API error mapping). */
export const toast = {
  info: (title: string, description?: string) =>
    useToastStore.getState().push({ title, tone: 'info', ...(description ? { description } : {}) }),
  success: (title: string, description?: string) =>
    useToastStore.getState().push({ title, tone: 'success', ...(description ? { description } : {}) }),
  warn: (title: string, description?: string) =>
    useToastStore.getState().push({ title, tone: 'warn', ...(description ? { description } : {}) }),
  error: (title: string, description?: string) =>
    useToastStore.getState().push({ title, tone: 'error', duration: 6000, ...(description ? { description } : {}) }),
  dismiss: (id: string) => {
    useToastStore.getState().dismiss(id);
  },
};
