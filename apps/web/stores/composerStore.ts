import { create } from 'zustand';

import type { Option, SliderPreset, TaskType } from '@/lib/api/types';

/** Options returned by `POST /chats` for a described task — shown once in the new chat. */
export interface PendingOptions {
  chatId: string;
  prompt: string;
  options: Option[];
}

/** A guest's message kept through sign-in, sent automatically once the chat exists (Handover "Guest mode"). */
export interface AutoRun {
  chatId: string;
  prompt: string;
  modelId: string | null;
}

export interface ComposerState {
  draft: string;
  /** New-chat category (PDF: chat, writing, coding, research, translation, image, music). */
  category: TaskType | null;
  /** Per-chat slider override; null = user's default from `me.slider`. */
  sliderOverride: SliderPreset | null;
  /** Model the next turn will run on; null = the recommended top pick. */
  selectedModelId: string | null;
  /** Compare mode picks (feature-flagged). */
  compareModelIds: [string | null, string | null];
  pendingOptions: PendingOptions | null;
  autoRun: AutoRun | null;
}

export interface ComposerActions {
  setDraft: (draft: string) => void;
  setCategory: (category: TaskType | null) => void;
  setSliderOverride: (slider: SliderPreset | null) => void;
  selectModel: (modelId: string | null) => void;
  setCompareModel: (slot: 0 | 1, modelId: string | null) => void;
  clearCompare: () => void;
  setPendingOptions: (pending: PendingOptions | null) => void;
  setAutoRun: (run: AutoRun | null) => void;
  /** Take (and clear) the auto-run for this chat, if any. */
  takeAutoRun: (chatId: string) => AutoRun | null;
  reset: () => void;
}

const initialState: ComposerState = {
  draft: '',
  category: null,
  sliderOverride: null,
  selectedModelId: null,
  compareModelIds: [null, null],
  pendingOptions: null,
  autoRun: null,
};

/** Composer state: draft and routing choices for the next turn. In-memory only. */
export const useComposerStore = create<ComposerState & ComposerActions>()((set, get) => ({
  ...initialState,
  setDraft: (draft) => {
    set({ draft });
  },
  setCategory: (category) => {
    set({ category });
  },
  setSliderOverride: (sliderOverride) => {
    set({ sliderOverride });
  },
  selectModel: (selectedModelId) => {
    set({ selectedModelId });
  },
  setCompareModel: (slot, modelId) => {
    set((s) => {
      const next: [string | null, string | null] = [s.compareModelIds[0], s.compareModelIds[1]];
      next[slot] = modelId;
      return { compareModelIds: next };
    });
  },
  clearCompare: () => {
    set({ compareModelIds: [null, null] });
  },
  setPendingOptions: (pendingOptions) => {
    set({ pendingOptions });
  },
  setAutoRun: (autoRun) => {
    set({ autoRun });
  },
  takeAutoRun: (chatId) => {
    const run = get().autoRun;
    if (run?.chatId !== chatId) return null;
    set({ autoRun: null });
    return run;
  },
  reset: () => {
    set(initialState);
  },
}));
