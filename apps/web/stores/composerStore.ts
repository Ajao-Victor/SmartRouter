import { create } from 'zustand';

import type { SliderPreset, TaskType } from '@/lib/api/types';

/** security.md §6 attachment allowlist. */
export const ATTACHMENT_MIME_ALLOWLIST: ReadonlySet<string> = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
  'application/pdf',
]);

/** GAP (Backend_Gaps_Report §7.1): PDF says "checked for size"; value unspecified. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const MAX_ATTACHMENTS = 4;

export type AttachmentRejection = 'type' | 'size' | 'count';

export interface ComposerState {
  draft: string;
  attachments: File[];
  /** New-chat category (PDF: chat, writing, coding, research, translation, image, music). */
  category: TaskType | null;
  /** Per-chat slider override; null = user's default from `me.slider`. */
  sliderOverride: SliderPreset | null;
  /** Model the next turn will run on; null = Auto (top pick). */
  selectedModelId: string | null;
  /** Compare mode picks (feature-flagged). */
  compareModelIds: [string | null, string | null];
}

export interface ComposerActions {
  setDraft: (draft: string) => void;
  /** Returns null when accepted, otherwise the rejection reason. */
  addAttachment: (file: File) => AttachmentRejection | null;
  removeAttachment: (index: number) => void;
  setCategory: (category: TaskType | null) => void;
  setSliderOverride: (slider: SliderPreset | null) => void;
  selectModel: (modelId: string | null) => void;
  setCompareModel: (slot: 0 | 1, modelId: string | null) => void;
  clearCompare: () => void;
  reset: () => void;
}

const initialState: ComposerState = {
  draft: '',
  attachments: [],
  category: null,
  sliderOverride: null,
  selectedModelId: null,
  compareModelIds: [null, null],
};

export function validateAttachment(file: File, currentCount: number): AttachmentRejection | null {
  if (currentCount >= MAX_ATTACHMENTS) return 'count';
  if (!ATTACHMENT_MIME_ALLOWLIST.has(file.type)) return 'type';
  if (file.size > MAX_UPLOAD_BYTES) return 'size';
  return null;
}

/** Composer state: draft, attachments and routing choices for the next turn. In-memory only. */
export const useComposerStore = create<ComposerState & ComposerActions>()((set, get) => ({
  ...initialState,
  setDraft: (draft) => {
    set({ draft });
  },
  addAttachment: (file) => {
    const rejection = validateAttachment(file, get().attachments.length);
    if (rejection) return rejection;
    set((s) => ({ attachments: [...s.attachments, file] }));
    return null;
  },
  removeAttachment: (index) => {
    set((s) => ({ attachments: s.attachments.filter((_, i) => i !== index) }));
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
  reset: () => {
    set(initialState);
  },
}));
