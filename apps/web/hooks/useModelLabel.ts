'use client';

import { FREE_MODEL_ID, FREE_MODEL_LABEL } from '@/lib/api/types';

import { useCatalog } from '@/hooks/useCatalog';

export interface ModelLabel {
  label: string;
  provider: string;
  isFree: boolean;
}

export function isFreeModel(modelId: string | null | undefined): boolean {
  return !!modelId && (modelId === FREE_MODEL_ID || modelId.startsWith('free:'));
}

/** Resolve a model id to its catalogue label (falls back to a readable form of the id). */
export function useModelLabel(modelId: string | null, hint?: string | null): ModelLabel | null {
  const catalog = useCatalog();
  if (!modelId) return null;
  const free = isFreeModel(modelId);
  const m = catalog.data?.find((x) => x.modelId === modelId);
  if (m) return { label: m.label || hint || modelId, provider: m.provider, isFree: free || m.free };
  return { label: hint || (free ? FREE_MODEL_LABEL : modelId.split(':').pop() ?? modelId), provider: '', isFree: free };
}
