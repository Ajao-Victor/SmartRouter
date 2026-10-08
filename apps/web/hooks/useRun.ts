'use client';

import { useCallback, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/keys';
import { runStream, type RunOutcome } from '@/lib/api/sse';
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
  /** Chosen model; null = Auto (top paid pick). */
  modelId: string | null;
  autoFreeFallback: boolean;
  freeAvailable: boolean;
  /** "Continue free" / "Rerun on free model". */
  forceFree?: boolean;
  /** Current message count (for optimistic seq). */
  seq: number;
}

export interface CompareRequest {
  prompt: string;
  quote: QuoteResponse;
  leftModelId: string;
  rightModelId: string;
  seq: number;
}

export type RunStart = 'started' | 'needs_top_up' | 'needs_requote' | 'free_exhausted' | 'no_allocation';

export interface NeedsTopUp {
  priceMicro: MicroUsd;
  prompt: string;
}

export interface ComparePair {
  userMessageId: string;
  leftMessageId: string;
  rightMessageId: string;
  leftModelId: string;
  rightModelId: string;
}

const FREE_REC: Recommendation = {
  model_id: FREE_MODEL_ID_DEFAULT,
  label: 'Free · Llama 3.1 8B',
  provider: 'Cloudflare Workers AI',
  price: micro(0),
  speed_label: 'fast',
  reason: '',
  score: 0,
  quality: 0,
  is_free: true,
  is_best_quality: false,
  searches_web: false,
  quote_id: null,
};

function quoteIdFor(rec: Recommendation, quote: QuoteResponse | null): string | null {
  if (rec.is_free) return null;
  if (!quote) return null;
  const id = rec.quote_id ?? (quote.quote.model_id === rec.model_id ? quote.quote.id : null);
  if (!id || isQuoteExpired(quote.quote.expires_at)) return null;
  return id;
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
  const [compare, setCompare] = useState<ComparePair | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  /** Reserve + sign a voucher for a paid option. Returns null when the cap is hit. */
  const reserveVoucher = useCallback(async (price: MicroUsd): Promise<{ voucher: Voucher } | 'cap' | 'no_signer'> => {
    const signer = useSignerStore.getState();
    if (!signer.channelId) return 'no_signer';
    try {
      const cumulative = signer.advance(price);
      const voucher = await getSessionClient().signVoucher({ channelId: signer.channelId, cumulativeMicro: cumulative });
      return { voucher };
    } catch (err) {
      if (err instanceof VoucherCapError) return 'cap';
      throw err;
    }
  }, []);

  /** Stream one assistant message and apply every PDF record/failure rule. */
  const executeStream = useCallback(
    async (args: { messageId: string; rec: Recommendation; quoteId: string | null; prompt: string; voucher?: Voucher; price: MicroUsd; isFree: boolean; reserved: boolean }): Promise<RunOutcome> => {
      const { messageId, rec, quoteId, prompt, voucher, price, isFree, reserved } = args;
      const controller = new AbortController();
      abortRef.current = controller;
      const outcome = await runStream(
        { quote_id: quoteId, chat_id: chatId, model_id: rec.model_id, prompt, ...(voucher ? { voucher } : {}) },
        {
          onMeta: (m) => {
            useStreamStore.getState().setMeta(messageId, { requestId: m.request_id, modelId: m.model_id });
          },
          onToken: (text) => {
            useStreamStore.getState().appendTokens(messageId, [text]);
          },
          onHeartbeat: () => {
            useStreamStore.getState().heartbeat(messageId);
          },
          onRetry: (r) => {
            useStreamStore.getState().retry(messageId, { fromModelId: r.from_model_id, toModelId: r.to_model_id, reason: r.reason });
          },
          onFile: (f) => {
            useStreamStore.getState().file(messageId, f);
          },
          onJob: (jobId) => {
            useStreamStore.getState().job(messageId, jobId);
          },
        },
        controller.signal,
      );
      abortRef.current = null;

      if (outcome.kind === 'done') {
        const entry = useStreamStore.getState().byMessageId[messageId];
        useStreamStore.getState().done(messageId, { priceMicro: outcome.data.price, latencyMs: outcome.data.latency_ms, requestId: outcome.data.request_id });
        if (!isFree) useAllocationStore.getState().applyVoucher(micro(outcome.data.price));
        cache.update(messageId, {
          content: entry?.tokens.join('') ?? '',
          status: 'done',
          request_id: outcome.data.request_id,
          model_id: entry?.modelId ?? rec.model_id,
          result_ref: entry?.file?.url ?? null,
        });
        void qc.invalidateQueries({ queryKey: queryKeys.session.current() });
        void qc.invalidateQueries({ queryKey: queryKeys.chats() });
        if (isFree) void qc.invalidateQueries({ queryKey: queryKeys.free.usage() });
        return outcome;
      }

      // No result delivered → the voucher amount is not counted (PDF failure rule).
      if (reserved) useSignerStore.getState().rollback(price);
      if (outcome.kind === 'aborted') {
        useStreamStore.getState().fail(messageId, { code: 'aborted', message: 'Cancelled', canRerunFree: true });
      } else {
        useStreamStore.getState().fail(messageId, { code: outcome.data.code, message: outcome.data.message, canRerunFree: outcome.data.can_rerun_free || !isFree });
        if (outcome.data.code === 'rate_limited') setCooldownKey((k) => k + 1);
      }
      cache.update(messageId, { status: 'error' });
      return outcome;
    },
    [cache, chatId, qc],
  );

  const run = useCallback(
    async (req: RunRequest): Promise<RunStart> => {
      const recs = req.quote?.recommendations ?? [];
      const freeRec = recs.find((r) => r.is_free) ?? FREE_REC;
      const rec: Recommendation | null = req.forceFree
        ? freeRec
        : req.modelId
          ? (recs.find((r) => r.model_id === req.modelId) ?? null)
          : (recs.find((r) => !r.is_free) ?? recs[0] ?? null);
      if (!rec) return 'needs_requote';
      const isFree = rec.is_free;
      if (isFree && !req.freeAvailable) return 'free_exhausted';

      let quoteId: string | null = null;
      let price = micro(0);
      if (!isFree) {
        quoteId = quoteIdFor(rec, req.quote);
        if (!quoteId) return 'needs_requote';
        price = rec.price;
        const alloc = useAllocationStore.getState();
        if (alloc.status === 'none' || alloc.status === 'closed') return 'no_allocation';
        if (!selectCanAfford(price)(alloc)) {
          if (req.autoFreeFallback && req.freeAvailable) {
            toast.info('Allocation used — continuing free');
            return run({ ...req, forceFree: true });
          }
          setNeedsTopUp({ priceMicro: price, prompt: req.prompt });
          return 'needs_top_up';
        }
      }

      const userMsg = optimisticMessage(chatId, req.seq, { role: 'user', content: req.prompt, status: 'done' });
      const asstMsg = optimisticMessage(chatId, req.seq + 1, { role: 'assistant', content: '', status: 'streaming', model_id: rec.model_id });
      cache.append(userMsg);
      cache.append(asstMsg);
      useComposerStore.getState().setDraft('');
      useStreamStore.getState().start(asstMsg.id, { modelId: rec.model_id });
      setNeedsTopUp(null);
      setRunning(true);

      let voucher: Voucher | undefined;
      let reserved = false;
      if (!isFree) {
        const res = await reserveVoucher(price);
        if (res === 'cap' || res === 'no_signer') {
          setRunning(false);
          useStreamStore.getState().fail(asstMsg.id, { code: 'voucher', message: res === 'cap' ? 'Allocation used — Top up' : 'No allocation signer', canRerunFree: true });
          cache.update(asstMsg.id, { status: 'error' });
          if (res === 'cap') setNeedsTopUp({ priceMicro: price, prompt: req.prompt });
          return res === 'cap' ? 'needs_top_up' : 'no_allocation';
        }
        voucher = res.voucher;
        reserved = true;
      }

      await executeStream({ messageId: asstMsg.id, rec, quoteId, prompt: req.prompt, ...(voucher ? { voucher } : {}), price, isFree, reserved });
      setRunning(false);
      return 'started';
    },
    [cache, chatId, executeStream, reserveVoucher],
  );

  /** PDF Compare mode: two models run in parallel on one prompt; two vouchers, two streams. */
  const runCompare = useCallback(
    async (req: CompareRequest): Promise<RunStart> => {
      const recs = req.quote.recommendations;
      const left = recs.find((r) => r.model_id === req.leftModelId) ?? null;
      const right = recs.find((r) => r.model_id === req.rightModelId) ?? null;
      if (!left || !right) return 'needs_requote';
      const sides = [left, right].map((rec) => ({ rec, quoteId: quoteIdFor(rec, req.quote), price: rec.is_free ? micro(0) : rec.price }));
      if (sides.some((s) => !s.rec.is_free && !s.quoteId)) return 'needs_requote';
      const total = micro(sides.reduce((n, s) => n + s.price, 0));
      if (total > 0) {
        const alloc = useAllocationStore.getState();
        if (alloc.status === 'none' || alloc.status === 'closed') return 'no_allocation';
        if (!selectCanAfford(total)(alloc)) {
          setNeedsTopUp({ priceMicro: total, prompt: req.prompt });
          return 'needs_top_up';
        }
      }

      const userMsg = optimisticMessage(chatId, req.seq, { role: 'user', content: req.prompt, status: 'done' });
      const asst = sides.map((s, i) => optimisticMessage(chatId, req.seq + 1 + i, { role: 'assistant', content: '', status: 'streaming', model_id: s.rec.model_id }));
      cache.append(userMsg);
      for (const m of asst) cache.append(m);
      useComposerStore.getState().setDraft('');
      asst.forEach((m, i) => {
        useStreamStore.getState().start(m.id, { modelId: sides[i]?.rec.model_id ?? null });
      });
      setNeedsTopUp(null);
      setRunning(true);
      const leftMsg = asst[0];
      const rightMsg = asst[1];
      if (!leftMsg || !rightMsg) return 'needs_requote';
      setCompare({ userMessageId: userMsg.id, leftMessageId: leftMsg.id, rightMessageId: rightMsg.id, leftModelId: left.model_id, rightModelId: right.model_id });

      const vouchers: (Voucher | undefined)[] = [];
      for (const s of sides) {
        if (s.rec.is_free) {
          vouchers.push(undefined);
          continue;
        }
        const res = await reserveVoucher(s.price);
        if (res === 'cap' || res === 'no_signer') {
          setRunning(false);
          for (const m of asst) {
            useStreamStore.getState().fail(m.id, { code: 'voucher', message: 'Allocation used — Top up', canRerunFree: true });
            cache.update(m.id, { status: 'error' });
          }
          setNeedsTopUp({ priceMicro: total, prompt: req.prompt });
          return 'needs_top_up';
        }
        vouchers.push(res.voucher);
      }

      await Promise.all(
        sides.map((s, i) => {
          const m = asst[i];
          if (!m) return Promise.resolve();
          const v = vouchers[i];
          return executeStream({ messageId: m.id, rec: s.rec, quoteId: s.quoteId, prompt: req.prompt, ...(v ? { voucher: v } : {}), price: s.price, isFree: s.rec.is_free, reserved: !s.rec.is_free });
        }),
      );
      setRunning(false);
      return 'started';
    },
    [cache, chatId, executeStream, reserveVoucher],
  );

  /** "Rerun on free model" for a failed assistant message: replays the preceding user prompt on Free. */
  const rerunFree = useCallback(
    (prompt: string, seq: number, quote: QuoteResponse | null, freeAvailable: boolean) =>
      run({ prompt, quote, modelId: null, autoFreeFallback: false, freeAvailable, forceFree: true, seq }),
    [run],
  );

  return {
    run,
    runCompare,
    rerunFree,
    cancel,
    running,
    needsTopUp,
    clearNeedsTopUp: () => {
      setNeedsTopUp(null);
    },
    compare,
    clearCompare: () => {
      setCompare(null);
    },
    cooldownKey,
    bumpCooldown: () => {
      setCooldownKey((k) => k + 1);
    },
  };
}

export function isRateLimited(err: unknown): boolean {
  return err instanceof ApiError && err.code === 'rate_limited';
}
