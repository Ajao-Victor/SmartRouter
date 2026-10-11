'use client';

import { useCallback, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { ApiError, isApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/keys';
import { runStream, type RunOutcome, type SseError } from '@/lib/api/sse';
import { FREE_MODEL_ID, freeFallbackSchema, type FreeFallback, type Quote } from '@/lib/api/types';
import { micro, type MicroUsd } from '@/lib/money';
import { toPaymentError } from '@/lib/tempo/paymentErrors';
import { getCurrentWallet } from '@/lib/tempo/wallet';

import { optimisticMessage, useChatCache } from '@/hooks/useChat';
import { isQuoteExpired } from '@/hooks/useQuote';
import { selectCanAfford, useAllocationStore } from '@/stores/allocationStore';
import { useComposerStore } from '@/stores/composerStore';
import { useStreamStore } from '@/stores/streamStore';
import { toast } from '@/stores/toastStore';
import { useWalletStore } from '@/stores/walletStore';

export interface RunRequest {
  prompt: string;
  /** Fresh quote for the chosen model (price on the Send button). */
  quote: Quote;
  label?: string | null;
  autoFreeFallback: boolean;
}

export type RunStart = 'started' | 'needs_top_up' | 'needs_requote' | 'free_exhausted' | 'cancelled' | 'busy' | 'ignored';

export interface NeedsTopUp {
  priceUsd: MicroUsd;
  prompt: string;
  freeFallback: FreeFallback;
}

export interface ComparePair {
  compareGroup: string;
  userMessageId: string;
  leftMessageId: string;
  rightMessageId: string;
  leftModelId: string;
  rightModelId: string;
  prompt: string;
}

function compareGroupId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `cg_${String(Date.now())}_${Math.random().toString(36).slice(2)}`;
}

/**
 * PDF "A normal turn" + "Paying for runs" in the browser: quote → affordability check
 * (Top up / Continue free before contacting the server) → one-time payment prep → `POST /run`
 * (free: plain fetch; paid: the mppx manager with the voucher) → SSE events into the stream
 * store → `done`: record the charge and refresh the balance. Failed answers are never charged.
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

  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: queryKeys.session.current() });
    void qc.invalidateQueries({ queryKey: queryKeys.chats() });
    void qc.invalidateQueries({ queryKey: queryKeys.requests() });
  }, [qc]);

  /** Authorize the access key and configure the manager once (one passkey prompt, first paid run). */
  const preparePayments = useCallback(async (): Promise<void> => {
    const wallet = getCurrentWallet();
    if (!wallet) throw new ApiError({ status: 0, code: 'UNAUTHENTICATED', message: 'Sign in with your wallet to run paid models.' });
    if (useWalletStore.getState().paymentsReady) return;
    if (wallet.kind === 'passkey') toast.info('Setting up payments', 'Approve once in your passkey prompt. This deposits your allocation into a payment session.');
    try {
      await wallet.preparePayments(useAllocationStore.getState().suggestedDepositUsd);
      useWalletStore.getState().setPaymentsReady(true);
    } catch (err) {
      throw toPaymentError(err) ?? err;
    }
  }, []);

  /** Stream one assistant message and apply every PDF record/failure rule. */
  const executeStream = useCallback(
    async (args: { messageId: string; userMessageId: string; quote: Quote; prompt: string; compareGroup?: string }): Promise<RunOutcome> => {
      const { messageId, userMessageId, quote, prompt, compareGroup } = args;
      const controller = new AbortController();
      abortRef.current = controller;
      const outcome = await runStream(
        { quoteId: quote.quoteId, prompt, ...(compareGroup ? { compareGroup } : {}) },
        { free: quote.free },
        {
          onMeta: (m) => {
            useStreamStore.getState().setMeta(messageId, { requestId: m.requestId, modelId: m.modelId, label: m.label, priceUsd: m.priceUsd, free: m.free, userMessageId: m.userMessageId ?? null, assistantMessageId: m.assistantMessageId ?? null });
            if (m.usage?.deposit) useAllocationStore.getState().applyUsage(m.usage.deposit);
            else if (m.remainingUsd !== null && m.remainingUsd !== undefined) useAllocationStore.getState().setRemaining(m.remainingUsd);
            cache.update(messageId, { requestId: m.requestId, modelId: m.modelId });
            if (m.userMessageId) cache.update(userMessageId, { id: m.userMessageId });
          },
          onDelta: (text) => {
            useStreamStore.getState().append(messageId, text);
          },
          onHeartbeat: () => {
            useStreamStore.getState().heartbeat(messageId);
          },
          onFallback: (f) => {
            useStreamStore.getState().fallback(messageId, f);
            cache.update(messageId, { modelId: f.toModelId });
          },
          onPending: (p) => {
            useStreamStore.getState().pending(messageId, { requestId: p.requestId, pollUrl: p.pollUrl });
            cache.update(messageId, { requestId: p.requestId, status: 'pending' });
          },
        },
        controller.signal,
      );
      abortRef.current = null;

      if (outcome.kind === 'done') {
        const d = outcome.data;
        useStreamStore.getState().done(messageId, { chargedUsd: d.chargedUsd, latencyMs: d.latencyMs ?? null, requestId: d.requestId, files: d.files, citations: d.citations, text: d.text });
        if (d.usage?.deposit) useAllocationStore.getState().applyUsage(d.usage.deposit);
        else if (!quote.free) useAllocationStore.getState().applyCharge(d.chargedUsd);
        const entry = useStreamStore.getState().byMessageId[messageId];
        cache.update(messageId, { text: d.text ?? entry?.text ?? '', status: 'done', requestId: d.requestId, modelId: d.modelId || entry?.modelId || quote.modelId, chargedUsd: d.chargedUsd, files: d.files, citations: d.citations });
        refresh();
        return outcome;
      }
      if (outcome.kind === 'pending') return outcome;

      if (outcome.kind === 'aborted') {
        useStreamStore.getState().fail(messageId, { code: 'ABORTED', message: 'Stopped. You were not charged for an unfinished answer.', refunded: true, refundedUsd: null, canRerunFree: true });
      } else {
        const e: SseError = outcome.data;
        useStreamStore.getState().fail(messageId, { code: e.code, message: e.message, refunded: e.refunded, refundedUsd: e.refundedUsd ?? null, canRerunFree: e.freeRerun?.available ?? !quote.free });
        if (e.code === 'RATE_LIMITED') setCooldownKey((k) => k + 1);
      }
      cache.update(messageId, { status: 'error' });
      refresh();
      return outcome;
    },
    [cache, refresh],
  );

  /** Shared pre-flight: handles every error thrown before a stream starts. */
  const handlePreflightError = useCallback(
    (err: unknown, prompt: string, priceUsd: MicroUsd, cleanup: () => void): RunStart => {
      cleanup();
      const e = isApiError(err) ? err : toPaymentError(err);
      if (!e) {
        toast.error('Something went wrong, try again', err instanceof Error ? err.message : undefined);
        return 'cancelled';
      }
      switch (e.code) {
        case 'ALLOCATION_EXHAUSTED':
        case 'PAYMENT_REQUIRED': {
          const parsed = freeFallbackSchema.safeParse((e.details as { freeFallback?: unknown } | undefined)?.freeFallback ?? {});
          setNeedsTopUp({ priceUsd, prompt, freeFallback: parsed.success ? parsed.data : { available: true, remaining: null, modelId: FREE_MODEL_ID, auto: false } });
          return 'needs_top_up';
        }
        case 'QUOTE_EXPIRED':
        case 'VALIDATION_FAILED':
          return 'needs_requote';
        case 'QUOTE_USED':
          return 'ignored';
        case 'RATE_LIMITED':
          setCooldownKey((k) => k + 1);
          toast.warn(`Too many requests — try again in ${String(Math.max(1, Math.round(e.retryAfter ?? 10)))} s`);
          return 'busy';
        case 'SESSION_BUSY':
          toast.warn('A payment is already in progress', 'Wait for the current answer to start streaming.');
          return 'busy';
        case 'FREE_LIMIT_REACHED':
          toast.warn('Free messages reset at 00:00 UTC', 'Pick a paid model to keep going.');
          return 'free_exhausted';
        case 'PAYMENT_CANCELLED':
          toast.info('Payment cancelled', 'Nothing was charged. Your prompt is still in the box.');
          return 'cancelled';
        case 'UNAUTHENTICATED':
          toast.warn('Sign in to continue');
          return 'cancelled';
        case 'FORBIDDEN':
          toast.error('This payment session belongs to another wallet', 'Sign out and back in with the paying wallet.');
          return 'cancelled';
        case 'PROVIDER_UNAVAILABLE':
          toast.warn('No model is available for this task right now', 'Try another model or the free one.');
          return 'cancelled';
        default:
          toast.error(e.message);
          return 'cancelled';
      }
    },
    [],
  );

  const run = useCallback(
    async (req: RunRequest): Promise<RunStart> => {
      const { quote, prompt } = req;
      if (isQuoteExpired(quote.expiresAt)) return 'needs_requote';
      const price = quote.free ? micro(0) : quote.priceUsd;

      if (!quote.free) {
        const alloc = useAllocationStore.getState();
        if (alloc.status === 'closed' || !selectCanAfford(price)(alloc)) {
          if (req.autoFreeFallback) {
            toast.info('Allocation used — continuing free');
            return runFree(prompt);
          }
          setNeedsTopUp({ priceUsd: price, prompt, freeFallback: { available: true, remaining: null, modelId: FREE_MODEL_ID, auto: false } });
          return 'needs_top_up';
        }
      }

      setRunning(true);
      try {
        if (!quote.free) await preparePayments();
      } catch (err) {
        setRunning(false);
        return handlePreflightError(err, prompt, price, () => undefined);
      }

      const userMsg = optimisticMessage({ role: 'user', text: prompt });
      const asstMsg = optimisticMessage({ role: 'assistant', text: '', status: 'streaming', modelId: quote.modelId });
      cache.append(userMsg);
      cache.append(asstMsg);
      useComposerStore.getState().setDraft('');
      useStreamStore.getState().start(asstMsg.id, { modelId: quote.modelId, label: req.label ?? quote.label, free: quote.free });
      setNeedsTopUp(null);

      const outcome = await executeStream({ messageId: asstMsg.id, userMessageId: userMsg.id, quote, prompt });
      setRunning(false);
      if (outcome.kind === 'error' && ['ALLOCATION_EXHAUSTED', 'PAYMENT_REQUIRED', 'QUOTE_EXPIRED', 'QUOTE_USED', 'VALIDATION_FAILED', 'RATE_LIMITED', 'SESSION_BUSY', 'FREE_LIMIT_REACHED', 'PAYMENT_CANCELLED', 'UNAUTHENTICATED', 'FORBIDDEN', 'PROVIDER_UNAVAILABLE'].includes(outcome.data.code)) {
        // Pre-stream failure surfaced through the stream path: undo the optimistic turn and apply the PDF rule.
        const err = new ApiError({ status: 0, code: outcome.data.code as ApiError['code'], message: outcome.data.message });
        return handlePreflightError(err, prompt, price, () => {
          cache.remove(userMsg.id);
          cache.remove(asstMsg.id);
          useStreamStore.getState().clear(asstMsg.id);
          useComposerStore.getState().setDraft(prompt);
        });
      }
      return 'started';
    },
    // runFree is defined below; both are stable callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cache, executeStream, handlePreflightError, preparePayments],
  );

  /** "Continue free" / "Rerun on free model": re-quote with the free model, then run. */
  const runFree = useCallback(
    async (prompt: string): Promise<RunStart> => {
      try {
        const quote = await api.chats.quote(chatId, { prompt, modelId: FREE_MODEL_ID });
        return await run({ prompt, quote: { ...quote, free: true }, autoFreeFallback: false });
      } catch (err) {
        return handlePreflightError(err, prompt, micro(0), () => undefined);
      }
    },
    [chatId, handlePreflightError, run],
  );

  /** PDF Compare: two `/run` calls sharing a `compareGroup`, both answers stream side by side. */
  const runCompare = useCallback(
    async (req: { prompt: string; left: Quote; right: Quote }): Promise<RunStart> => {
      const { prompt, left, right } = req;
      if (isQuoteExpired(left.expiresAt) || isQuoteExpired(right.expiresAt)) return 'needs_requote';
      const total = micro((left.free ? 0 : left.priceUsd) + (right.free ? 0 : right.priceUsd));
      if (total > 0) {
        const alloc = useAllocationStore.getState();
        if (alloc.status === 'closed' || !selectCanAfford(total)(alloc)) {
          setNeedsTopUp({ priceUsd: total, prompt, freeFallback: { available: true, remaining: null, modelId: FREE_MODEL_ID, auto: false } });
          return 'needs_top_up';
        }
      }
      setRunning(true);
      try {
        if (total > 0) await preparePayments();
      } catch (err) {
        setRunning(false);
        return handlePreflightError(err, prompt, total, () => undefined);
      }
      const compareGroup = compareGroupId();
      const userMsg = optimisticMessage({ role: 'user', text: prompt });
      const leftMsg = optimisticMessage({ role: 'assistant', text: '', status: 'streaming', modelId: left.modelId });
      const rightMsg = optimisticMessage({ role: 'assistant', text: '', status: 'streaming', modelId: right.modelId });
      cache.append(userMsg);
      cache.append(leftMsg);
      cache.append(rightMsg);
      useComposerStore.getState().setDraft('');
      useStreamStore.getState().start(leftMsg.id, { modelId: left.modelId, label: left.label, free: left.free });
      useStreamStore.getState().start(rightMsg.id, { modelId: right.modelId, label: right.label, free: right.free });
      setNeedsTopUp(null);
      setCompare({ compareGroup, userMessageId: userMsg.id, leftMessageId: leftMsg.id, rightMessageId: rightMsg.id, leftModelId: left.modelId ?? '', rightModelId: right.modelId ?? '', prompt });
      await Promise.all([
        executeStream({ messageId: leftMsg.id, userMessageId: userMsg.id, quote: left, prompt, compareGroup }),
        executeStream({ messageId: rightMsg.id, userMessageId: userMsg.id, quote: right, prompt, compareGroup }),
      ]);
      setRunning(false);
      return 'started';
    },
    [cache, executeStream, handlePreflightError, preparePayments],
  );

  return {
    run,
    runFree,
    runCompare,
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
  return err instanceof ApiError && err.code === 'RATE_LIMITED';
}
