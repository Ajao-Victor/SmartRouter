import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { idbStateStorage } from '@/lib/idb';

export type DialogId = 'modelPicker' | 'waitlist' | 'spendPermission' | 'openAllocation';
export type Theme = 'dark' | 'light';

export interface UiState {
  /** Single-depth dialog stack (UI_UX_Brief §6). */
  activeDialog: DialogId | null;
  walletSheetOpen: boolean;
  compareMode: boolean;
  /** Persisted preferences. */
  theme: Theme;
  forceReducedMotion: boolean;
  /** True while a Tempo SDK dialog is open — WebGL pauses, our overlays stay below it. */
  sdkDialogOpen: boolean;
  /** Set once `persist` has rehydrated from IndexedDB on the client. */
  hydrated: boolean;
}

export interface UiActions {
  openDialog: (id: DialogId) => void;
  closeDialog: () => void;
  toggleWallet: (open?: boolean) => void;
  setCompareMode: (on: boolean) => void;
  setTheme: (theme: Theme) => void;
  setForceReducedMotion: (on: boolean) => void;
  setSdkDialogOpen: (open: boolean) => void;
  markHydrated: () => void;
  reset: () => void;
}

const initialState: UiState = {
  activeDialog: null,
  walletSheetOpen: false,
  compareMode: false,
  theme: 'dark',
  forceReducedMotion: false,
  sdkDialogOpen: false,
  hydrated: false,
};

/**
 * Global UI state. `theme` and `forceReducedMotion` persist to IndexedDB.
 * SSR strategy: `skipHydration` so the server and first client paint use defaults;
 * `StoreHydrator` calls `rehydrate()` after mount → no hydration mismatch.
 */
export const useUiStore = create<UiState & UiActions>()(
  persist(
    (set) => ({
      ...initialState,
      openDialog: (id) => {
        set({ activeDialog: id });
      },
      closeDialog: () => {
        set({ activeDialog: null });
      },
      toggleWallet: (open) => {
        set((s) => ({ walletSheetOpen: open ?? !s.walletSheetOpen }));
      },
      setCompareMode: (on) => {
        set({ compareMode: on });
      },
      setTheme: (theme) => {
        set({ theme });
      },
      setForceReducedMotion: (on) => {
        set({ forceReducedMotion: on });
      },
      setSdkDialogOpen: (open) => {
        set({ sdkDialogOpen: open });
      },
      markHydrated: () => {
        set({ hydrated: true });
      },
      reset: () => {
        // Preferences survive logout; transient UI resets.
        set((s) => ({ ...initialState, theme: s.theme, forceReducedMotion: s.forceReducedMotion, hydrated: s.hydrated }));
      },
    }),
    {
      name: 'sr:ui',
      version: 1,
      storage: createJSONStorage(() => idbStateStorage),
      partialize: (s) => ({ theme: s.theme, forceReducedMotion: s.forceReducedMotion }),
      skipHydration: true,
    },
  ),
);
