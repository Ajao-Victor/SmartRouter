'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { isApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { describeAction, toUiAction } from '@/lib/api/errors';
import type { Option, Quote, SliderPreset } from '@/lib/api/types';
import { formatUsd } from '@/lib/money';

import { useChat, useChatCache } from '@/hooks/useChat';
import { useCompareVote } from '@/hooks/useFeedback';
import { useMe } from '@/hooks/useMe';
import { useModelLabel } from '@/hooks/useModelLabel';
import { usePending } from '@/hooks/usePending';
import { isQuoteExpired } from '@/hooks/useQuote';
import { useRun } from '@/hooks/useRun';
import { useTopUp } from '@/hooks/useTopUp';
import { useAllocationStore } from '@/stores/allocationStore';
import { useComposerStore } from '@/stores/composerStore';
import { useStreamStore } from '@/stores/streamStore';
import { toast } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';

import { LowBalanceBanner } from '@/components/allocation/LowBalanceBanner';
import { TopUpBar } from '@/components/allocation/TopUpBar';
import { CompareSplit } from '@/components/chat/CompareSplit';
import { Composer } from '@/components/chat/Composer';
import { ModelOptions } from '@/components/chat/ModelOptions';
import { ModelPicker } from '@/components/chat/ModelPicker';
import { Thread } from '@/components/chat/Thread';
import { Skeleton } from '@/components/ui/Skeleton';

export interface ChatWorkspaceProps {
  chatId: string;
}

/** A quote the workspace holds for the draft: which prompt and model it priced. */
interface HeldQuote {
  prompt: string;
  modelId: string | null;
  quote: Quote;
}

const QUOTE_DEBOUNCE_MS = 700;

/** An option from `POST /chats` / `POST /recommend` already carries a quote for its prompt. */
function quoteFromOption(o: Option): Quote | null {
  if (!o.quoteId || !o.expiresAt) return null;
  return { quoteId: o.quoteId, priceUsd: o.priceUsd, free: o.free, expiresAt: o.expiresAt, modelId: o.modelId, label: o.label || null, suggestion: null };
}

/**
 * The chat screen (PDF "A normal turn"): thread → composer. Typing quotes the draft for the
 * current model (price on Send); Send runs the quote; expired quotes are re-quoted quietly and
 * only a changed price asks for another press. Top-up / Continue free appear inline when the
 * allocation is used; compare runs two models side by side.
 */
export function ChatWorkspace({ chatId }: ChatWorkspaceProps) {
  const router = useRouter();
  const me = useMe();
  const chat = useChat(chatId);
  const runner = useRun(chatId);
  const topUp = useTopUp();
  const cache = useChatCache(chatId);
  const compareVote = useCompareVote();
  usePending(chatId);

  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const compareMode = useUiStore((s) => s.compareMode);
  const setCompareMode = useUiStore((s) => s.setCompareMode);
  const draft = useComposerStore((s) => s.draft);
  const selectedModelId = useComposerStore((s) => s.selectedModelId);
  const selectModel = useComposerStore((s) => s.selectModel);
  const sliderOverride = useComposerStore((s) => s.sliderOverride);
  const compareIds = useComposerStore((s) => s.compareModelIds);
  const setCompareModel = useComposerStore((s) => s.setCompareModel);
  const clearCompareIds = useComposerStore((s) => s.clearCompare);
  const pendingOptions = useComposerStore((s) => s.pendingOptions);
  const setPendingOptions = useComposerStore((s) => s.setPendingOptions);
  const streamEntries = useStreamStore((s) => s.byMessageId);
  const suggestedDeposit = useAllocationStore((s) => s.suggestedDepositUsd);

  const [held, setHeld] = useState<HeldQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const quoteSeq = useRef(0);

  const slider: SliderPreset = sliderOverride ?? me.data?.slider ?? chat.data?.slider ?? 'balanced';
  const autoFree = me.data?.autoFreeFallback ?? true;
  const currentModelId = selectedModelId ?? chat.data?.currentModelId ?? null;
  const currentModel = useModelLabel(currentModelId, held?.quote.label);
  const prompt = draft.trim();
  const options = pendingOptions?.chatId === chatId ? pendingOptions : null;
  const quoteFresh = held !== null && held.prompt === prompt && held.modelId === currentModelId && !isQuoteExpired(held.quote.expiresAt);
  const freshQuote = quoteFresh ? held.quote : null;

  useEffect(() => {
    setPageTitle(chat.data?.title ?? null);
    return () => {
      setPageTitle(null);
    };
  }, [chat.data?.title, setPageTitle]);

  /** `POST /chats/:id/quote { prompt, modelId? }` for the draft; the newest request wins. */
  const fetchQuote = useCallback(
    async (p: string, modelId: string | null): Promise<Quote | null> => {
      const seq = ++quoteSeq.current;
      setQuoting(true);
      try {
        const q = await api.chats.quote(chatId, { prompt: p, ...(modelId ? { modelId } : {}) });
        if (seq !== quoteSeq.current) return null;
        setHeld({ prompt: p, modelId, quote: q });
        if (q.suggestion && q.suggestion.modelId !== (modelId ?? q.modelId)) {
          toast.info(`This looks like ${q.suggestion.taskType ?? 'a different task'}`, `${q.suggestion.label || q.suggestion.modelId} may do better — pick it from the model menu.`);
        }
        return q;
      } catch (err) {
        if (seq !== quoteSeq.current) return null;
        const action = toUiAction(err);
        if (action.kind === 'cooldown') runner.bumpCooldown();
        else if (action.kind === 'sign_in') router.replace('/');
        else if (action.kind !== 'offline') toast.error('Could not get a price', describeAction(action));
        return null;
      } finally {
        if (seq === quoteSeq.current) setQuoting(false);
      }
    },
    [chatId, router, runner],
  );

  // Quote the draft while the user pauses typing so the Send button always shows the price.
  useEffect(() => {
    if (!prompt || runner.running || compareMode || quoteFresh) return;
    const t = window.setTimeout(() => {
      void fetchQuote(prompt, currentModelId);
    }, QUOTE_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(t);
    };
  }, [prompt, currentModelId, runner.running, compareMode, quoteFresh, fetchQuote]);

  const afterRun = useCallback(
    (result: Awaited<ReturnType<typeof runner.run>>, p: string, q: Quote) => {
      if (result === 'started') {
        setHeld(null);
        setPendingOptions(null);
      } else if (result === 'needs_requote') {
        void fetchQuote(p, q.modelId).then((fresh) => {
          if (!fresh) return;
          if (fresh.priceUsd !== q.priceUsd && !fresh.free) toast.info(`The price changed to ${formatUsd(fresh.priceUsd)}`, 'Press Send to confirm.');
          else void runner.run({ prompt: p, quote: fresh, label: fresh.label, autoFreeFallback: autoFree }).then((r) => { afterRun(r, p, fresh); });
        });
      }
    },
    [autoFree, fetchQuote, runner, setPendingOptions],
  );

  const runWithQuote = useCallback(
    async (p: string, q: Quote) => {
      const result = await runner.run({ prompt: p, quote: q, label: q.label, autoFreeFallback: autoFree });
      afterRun(result, p, q);
    },
    [afterRun, autoFree, runner],
  );

  const startCompare = useCallback(
    async (p: string) => {
      const [l, r] = compareIds;
      if (!l || !r) {
        toast.warn('Pick two models to compare', 'Open the model menu and tick two.');
        return;
      }
      setQuoting(true);
      try {
        const [left, right] = await Promise.all([api.chats.quote(chatId, { prompt: p, modelId: l }), api.chats.quote(chatId, { prompt: p, modelId: r })]);
        const result = await runner.runCompare({ prompt: p, left, right });
        if (result === 'started') setHeld(null);
      } catch (err) {
        const action = toUiAction(err);
        toast.error('Could not start the comparison', describeAction(action));
      } finally {
        setQuoting(false);
      }
    },
    [chatId, compareIds, runner],
  );

  const onSend = (p: string) => {
    if (compareMode) {
      void startCompare(p);
      return;
    }
    if (freshQuote) {
      void runWithQuote(p, freshQuote);
      return;
    }
    const shownPrice = held && held.prompt === p ? held.quote.priceUsd : null;
    void fetchQuote(p, currentModelId).then((q) => {
      if (!q) return;
      if (shownPrice !== null && !q.free && q.priceUsd > shownPrice) {
        toast.info(`The price changed to ${formatUsd(q.priceUsd)}`, 'Press Send to confirm.');
        return;
      }
      void runWithQuote(p, q);
    });
  };

  const onPickOption = (o: Option) => {
    if (!options) return;
    selectModel(o.modelId);
    const q = quoteFromOption(o);
    if (q && !isQuoteExpired(q.expiresAt)) {
      void runWithQuote(options.prompt, q);
      return;
    }
    void fetchQuote(options.prompt, o.modelId).then((fresh) => {
      if (fresh) void runWithQuote(options.prompt, fresh);
    });
  };

  const onCompareToggle = (modelId: string) => {
    const [l, r] = compareIds;
    if (l === modelId) setCompareModel(0, null);
    else if (r === modelId) setCompareModel(1, null);
    else if (!l) setCompareModel(0, modelId);
    else if (!r) setCompareModel(1, modelId);
    else setCompareModel(1, modelId);
  };

  const onSelectModel = (modelId: string) => {
    selectModel(modelId);
    cache.setCurrentModel(modelId);
    api.chats.update(chatId, { currentModelId: modelId }).catch(() => undefined);
  };

  const onTopUp = (then?: () => void) => {
    topUp.mutate(suggestedDeposit, {
      onSuccess: () => {
        runner.clearNeedsTopUp();
        then?.();
      },
    });
  };

  const pair = runner.compare;
  const leftMsg = pair ? (chat.data?.messages.find((m) => m.id === pair.leftMessageId) ?? null) : null;
  const rightMsg = pair ? (chat.data?.messages.find((m) => m.id === pair.rightMessageId) ?? null) : null;
  const settled = (id: string) => ['done', 'error'].includes(streamEntries[id]?.status ?? '');
  const pairDone = pair !== null && settled(pair.leftMessageId) && settled(pair.rightMessageId);

  const onPick = (side: 'left' | 'right') => {
    if (!pair) return;
    const loserId = side === 'left' ? pair.rightMessageId : pair.leftMessageId;
    const winnerId = side === 'left' ? pair.leftMessageId : pair.rightMessageId;
    const winnerModel = side === 'left' ? pair.leftModelId : pair.rightModelId;
    const winnerReq = streamEntries[winnerId]?.result?.requestId ?? streamEntries[winnerId]?.requestId;
    if (winnerReq) compareVote.mutate({ compareGroup: pair.compareGroup, winnerRequestId: winnerReq, prompt: pair.prompt });
    onSelectModel(winnerModel);
    cache.remove(loserId);
    useStreamStore.getState().clear(loserId);
    runner.clearCompare();
    clearCompareIds();
    setCompareMode(false);
  };

  if (chat.isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (chat.isError) {
    const action = toUiAction(chat.error);
    return (
      <p role="alert" className="text-sm text-signal">
        {action.kind === 'not_found' ? 'This chat no longer exists.' : isApiError(chat.error) ? chat.error.message : 'Could not load this chat.'}
      </p>
    );
  }

  const messages = chat.data.messages;
  const needsTopUp = runner.needsTopUp;
  const weeklyLimit = (needsTopUp?.freeFallback as { reason?: string } | undefined)?.reason === 'weekly_limit';

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col">
      <div className="flex-1 space-y-8 pb-8">
        {messages.length === 0 && !options && (
          <div className="pt-10 text-center">
            <p className="text-lg text-text-1">{chat.data.title ?? 'New chat'}</p>
            <p className="mt-1 text-sm text-text-2">Say what you need. The price shows on Send before anything runs.</p>
          </div>
        )}

        <Thread
          messages={messages}
          exclude={pair ? [pair.leftMessageId, pair.rightMessageId] : []}
          onRerunFree={(messageId) => {
            const idx = messages.findIndex((m) => m.id === messageId);
            const prev = [...messages.slice(0, Math.max(0, idx))].reverse().find((m) => m.role === 'user');
            if (prev) void runner.runFree(prev.text);
          }}
        >
          {pair && leftMsg && rightMsg && <CompareSplit left={leftMsg} right={rightMsg} canPick={pairDone} onPick={onPick} />}

          {options && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-bg-2 px-4 py-2.5 text-base leading-7 whitespace-pre-wrap text-text-0">{options.prompt}</div>
              </div>
              <ModelOptions
                title="Pick a model for this task"
                description="Three good fits plus the free option. Tap one to run it at that price."
                options={options.options}
                selectedId={currentModelId}
                onPick={onPickOption}
                compareMode={compareMode}
                compareIds={compareIds}
                onCompareToggle={onCompareToggle}
                disabled={runner.running || quoting}
              />
            </div>
          )}

          {needsTopUp && (
            <TopUpBar
              topUpUsd={suggestedDeposit}
              toppingUp={topUp.isPending}
              freeAvailable={needsTopUp.freeFallback.available}
              freeRemaining={needsTopUp.freeFallback.remaining}
              reason={weeklyLimit ? 'weekly_limit' : 'allocation'}
              onTopUp={() => {
                onTopUp(() => {
                  useComposerStore.getState().setDraft(needsTopUp.prompt);
                  void fetchQuote(needsTopUp.prompt, currentModelId).then((q) => {
                    if (q) void runWithQuote(needsTopUp.prompt, q);
                  });
                });
              }}
              onContinueFree={() => {
                runner.clearNeedsTopUp();
                void runner.runFree(needsTopUp.prompt);
              }}
            />
          )}
        </Thread>
      </div>

      <div className="sticky bottom-0 z-content -mx-4 space-y-2 bg-bg-0/95 px-4 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-sm">
        <LowBalanceBanner
          nextPriceUsd={freshQuote && !freshQuote.free ? freshQuote.priceUsd : null}
          toppingUp={topUp.isPending}
          onTopUp={() => {
            onTopUp();
          }}
        />
        <Composer
          quote={freshQuote ? { priceUsd: freshQuote.priceUsd, free: freshQuote.free } : null}
          quoting={quoting}
          running={runner.running}
          currentModel={currentModel ? { label: currentModel.label, isFree: currentModel.isFree } : null}
          onSend={onSend}
          onStop={runner.cancel}
          cooldownKey={runner.cooldownKey}
          {...(options ? { placeholder: 'Or type something else…' } : {})}
        />
        <p className="text-center text-2xs text-text-2">Failed answers are never charged. Quality data: LMArena, Artificial Analysis.</p>
      </div>

      <ModelPicker
        currentModelId={currentModelId}
        prompt={prompt || options?.prompt || ''}
        slider={slider}
        taskType={chat.data.taskType}
        onSelect={onSelectModel}
        compareMode={compareMode}
        compareIds={compareIds}
        onCompareToggle={onCompareToggle}
      />
    </div>
  );
}
