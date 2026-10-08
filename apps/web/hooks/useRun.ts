'use client';

import { useCallback, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/keys';
import { runStream } from '@/lib/api/sse';
import { FREE_MODEL_ID_DEFAULT, type QuoteResponse, type Recommendation, type Voucher } from '@/lib/api/types';
import { micro, type MicroUsd } from '@/lib/money';
import { getSessionClient } from '@/lib/tempo/session';

import { optimisticMessage, useChatCache } from '@/hooks/useChat';
import { isQuoteExpired } from '@/hooks/useQuote';
import { selectCanAfford, useAllocationStore } from '@/stores/allocationStore';
import { useComposerStore } from '@/stores/composerStore';
import { useSignerStore, VoucherCapError } from '@/stores/signerStore';
import { useStreamStore } from '@/stores/streamStore';
import { toast } from '@/stores/toastStore';


export interface RunRequest {
  prompt: string;
  /** Current quote response (recommendations + quote). Null only for `forceFree`. */
  quote: QuoteResponse | null;
  /** Chosen model; null = Auto (top pick). */
  modelId: string | null;
  autoFreeFallback: boolean;
  freeAvailable: boolean;
  /** "Continue free" / "Rerun on free model". */
  forceFree?: boolean;
  /** Current message count (for optimistic seq). */
  seq: number;
}

export type RunStart = 'started' | 'needs_top_up' | 'needs_requote' | 'free_exhausted' | 'no_allocation';

export interface NeedsTopUp {
  priceMicro: MicroUsd;
  prompt: string;
}

/**
 * PDF request lifecycle steps 6–11 in the browser:
 * allocation check → (sign cumulative voucher) → `/run` SSE → stream store → record → feedback.
 * Failure rules: no result → voucher not counted (restore + rollback); error → rerun on free.
 */
export function useRun(chatId: string) {
  const qc = useQueryClient();
  const cache = useChatCache(chatId);
  const [needsTopUp, setNeedsTopUp] = useState<NeedsTopUp | null>(null);
  const [running, setRunning] = useState(false);
  const [cooldownKey, setCooldownKey] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const run = useCallback(
    async (req: RunRequest): Promise<RunStart> => {
      const recs = req.quote?.recommendations ?? [];
      const freeRec = recs.find((r) => r.is_free) ?? null;
      let rec: Recommendation | null = req.forceFree
        ? freeRec
        : req.modelId
          ? (recs.find((r) => r.model_id === req.modelId) ?? null)
          : (recs.find((r) => !r.is_free) ?? recs[0] ?? null);

      let isFree = req.forceFree || (rec?.is_free ?? false);
      if (req.forceFree && !rec) {
        rec = { model_id: FREE_MODEL_ID_DEFAULT, label: 'Free · Llama 3.1 8B', provider: 'Cloudflare Workers AI', price: micro(0), speed_label: 'fast', reason: '', score: 0, quality: 0, is_free: true, is_best_quality: false, searches_web: false, quote_id: null };
        isFree = true;
      }
      if (!rec) return 'needs_requote';
      if (isFree && !req.freeAvailable) return 'free_exhausted';

      let quoteId: string | null = null;
      let price = micro(0);
      if (!isFree) {
        if (!req.quote) return 'needs_requote';
        quoteId = rec.quote_id ?? (req.quote.quote.model_id === rec.model_id ? req.quote.quote.id : null);
        if (!quoteId || isQuoteExpired(req.quote.quote.expires_at)) return 'needs_requote';
        price = rec.price;
        const alloc = useAllocationStore.getState();
        if (alloc.status === 'none' || alloc.status === 'closed') return 'no_allocation';
        if (!selectCanAfford(price)(alloc)) {
          if (req.autoFreeFallback && req.freeAvailable && freeRec) {
            toast.info('Allocation used — continuing free');
            return run({ ...req, forceFree: true });
          }
          setNeedsTopUp({ priceMicro: price, prompt: req.prompt });
          return 'needs_top_up';
        }
      }

      // Optimistic messages (PDF: each reply records which model wrote it).
      const userMsg = optimisticMessage(chatId, req.seq, { role: 'user', content: req.prompt, status: 'done' });
      const asstMsg = optimisticMessage(chatId, req.seq + 1, { role: 'assistant', content: '', status: 'streaming', model_id: rec.model_id });
      cache.append(userMsg);
      cache.append(asstMsg);
      useComposerStore.getState().setDraft('');
      const stream = useStreamStore.getState();
      stream.start(asstMsg.id, { modelId: rec.model_id });
      setNeedsTopUp(null);
      setRunning(true);

      let voucher: Voucher | undefined;
      let reserved = false;
      try {
        if (!isFree) {
          const signer = useSignerStore.getState();
          if (!signer.channelId) throw new Error('No allocation signer');
          const cumulative = signer.advance(price);
          reserved = true;
          voucher = await getSessionClient().signVoucher({ channelId: signer.channelId, cumulativeMicro: cumulative });
        }
      } catch (err) {
        setRunning(false);
        stream.fail(asstMsg.id, { code: 'voucher', message: err instanceof VoucherCapError ? 'Allocation used — Top up' : 'Could not sign the voucher', canRerunFree: true });
        cache.update(asstMsg.id, { status: 'error' });
        if (err instanceof VoucherCapError) setNeedsTopUp({ priceMicro: price, prompt: req.prompt });
        return 'needs_top_up';
      }

      const controller = new AbortController();
      abortRef.current = controller;
      const modelId = rec.model_id;
      const outcome = await runStream(
        { quote_id: quoteId, chat_id: chatId, model_id: modelId, prompt: req.prompt, ...(voucher ? { voucher } : {}) },
        {
          onMeta: (m) => {
            useStreamStore.getState().setMeta(asstMsg.id, { requestId: m.request_id, modelId: m.model_id });
          },
          onToken: (text) => {
            useStreamStore.getState().appendTokens(asstMsg.id, [text]);
          },
          onHeartbeat: () => {
            useStreamStore.getState().heartbeat(asstMsg.id);
          },
          onRetry: (r) => {
            useStreamStore.getState().retry(asstMsg.id, { fromModelId: r.from_model_id, toModelId: r.to_model_id, reason: r.reason });
          },
          onFile: (f) => {
            useStreamStore.getState().file(asstMsg.id, f);
          },
          onJob: (jobId) => {
            useStreamStore.getState().job(asstMsg.id, jobId);
          },
        },
        controller.signal,
      );
      abortRef.current = null;
      setRunning(false);

      if (outcome.kind === 'done') {
        const entry = useStreamStore.getState().byMessageId[asstMsg.id];
        useStreamStore.getState().done(asstMsg.id, { priceMicro: outcome.data.price, latencyMs: outcome.data.latency_ms, requestId: outcome.data.request_id });
        if (!isFree) useAllocationStore.getState().applyVoucher(micro(outcome.data.price));
        cache.update(asstMsg.id, {
          content: entry?.tokens.join('') ?? '',
          status: 'done',
          request_id: outcome.data.request_id,
          model_id: entry?.modelId ?? modelId,
          result_ref: entry?.file?.url ?? null,
        });
        cache.setCurrentModel(entry?.modelId ?? modelId);
        void qc.invalidateQueries({ queryKey: queryKeys.session.current() });
        void qc.invalidateQueries({ queryKey: queryKeys.chats() });
        if (isFree) void qc.invalidateQueries({ queryKey: queryKeys.free.usage() });
        return 'started';
      }

      // No result delivered → the voucher amount is not counted (PDF failure rule).
      if (reserved) useSignerStore.getState().rollback(price);
      if (outcome.kind === 'aborted') {
        useStreamStore.getState().fail(asstMsg.id, { code: 'aborted', message: 'Cancelled', canRerunFree: true });
      } else {
        useStreamStore.getState().fail(asstMsg.id, { code: outcome.data.code, message: outcome.data.message, canRerunFree: outcome.data.can_rerun_free || !isFree });
        if (outcome.data.code === 'rate_limited') setCooldownKey((k) => k + 1);
      }
      cache.update(asstMsg.id, { status: 'error' });
      return 'started';
    },
    [cache, chatId, qc],
  );

  /** "Rerun on free model" for a failed assistant message: replays the preceding user prompt on Free. */
  const rerunFree = useCallback(
    (prompt: string, seq: number, quote: QuoteResponse | null, freeAvailable: boolean) =>
      run({ prompt, quote, modelId: null, autoFreeFallback: false, freeAvailable, forceFree: true, seq }),
    [run],
  );

  return { run, rerunFree, cancel, running, needsTopUp, clearNeedsTopUp: () => { setNeedsTopUp(null); }, cooldownKey, bumpCooldown: () => { setCooldownKey((k) => k + 1); } };
}

export function isRateLimited(err: unknown): boolean {
  return err instanceof ApiError && err.code === 'rate_limited';
}
