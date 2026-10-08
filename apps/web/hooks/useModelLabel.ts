'use client';

import { useModels } from '@/hooks/useModels';

export interface ModelLabel {
  label: string;
  provider: string;
  isFree: boolean;
}

/** Resolve a model id to its catalog label (falls back to the id). */
export function useModelLabel(modelId: string | null): ModelLabel | null {
  const models = useModels();
  if (!modelId) return null;
  const m = models.data?.find((x) => x.id === modelId);
  if (!m) return { label: modelId, provider: '', isFree: modelId.startsWith('cloudflare:') };
  return { label: m.label, provider: m.provider, isFree: m.payment === 'free' };
}
