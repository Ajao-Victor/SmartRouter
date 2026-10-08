'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { AnimatePresence } from 'motion/react';

import { isApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import type { SliderPreset } from '@/lib/api/types';


import { useChat, useChatCache } from '@/hooks/useChat';
import { useCompareVote } from '@/hooks/useFeedback';
import { useFreeUsage } from '@/hooks/useFreeUsage';
import { useJobs } from '@/hooks/useJobs';
import { useMe } from '@/hooks/useMe';
import { useModelLabel } from '@/hooks/useModelLabel';
import { useQuote } from '@/hooks/useQuote';
import { useRun } from '@/hooks/useRun';
import { useTopUp } from '@/hooks/useTopUp';
import { useComposerStore } from '@/stores/composerStore';
import { useStreamStore } from '@/stores/streamStore';
import { toast } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';

import { TopUpBar } from '@/components/allocation/TopUpBar';
import { CompareSplit } from '@/components/chat/CompareSplit';
import { Composer } from '@/components/chat/Composer';
import { ModelPicker } from '@/components/chat/ModelPicker';
import { Thread } from '@/components/chat/Thread';
import { ThreadNotes } from '@/components/chat/ThreadNotes';
import { useGlowTrail } from '@/components/fx/GlowTrail';
import { RecommendationPanel } from '@/components/recommend/RecommendationPanel';
import { Skeleton } from '@/components/ui/Skeleton';

export interface ChatWorkspaceProps {
  chatId: string;
}

/**
 * The chat screen (architecture.md §5.1): Thread → RecommendationPanel (when quoted) → TopUpBar
 * (when needed) → floating Composer. Owns the quote → pick → run orchestration and the
 * GlowTrail from the Run button through the chosen card to the HUD.
 */
export function ChatWorkspace({ chatId }: ChatWorkspaceProps) {
  const params = useSearchParams();
  const me = useMe();
  const chat = useChat(chatId);
  const freeUsage = useFreeUsage();
  const quote = useQuote(chatId);
  const runner = useRun(chatId);
  const topUp = useTopUp();
  const drawTrail = useGlowTrail();
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const compareMode = useUiStore((s) => s.compareMode);
  const setCompareMode = useUiStore((s) => s.setCompareMode);
  const compareIds = useComposerStore((s) => s.compareModelIds);
  const setCompareModel = useComposerStore((s) => s.setCompareModel);
  const clearCompareIds = useComposerStore((s) => s.clearCompare);
  const compareVote = useCompareVote();
  const cache = useChatCache(chatId);
  const streamEntries = useStreamStore((s) => s.byMessageId);
  const jobs = useJobs(
    Object.entries(streamEntries)
      .filter(([, e]) => e.jobId !== null)
      .map(([messageId, e]) => ({ messageId, jobId: e.jobId ?? '' })),
  );

  const draft = useComposerStore((s) => s.draft);
  const selectedModelId = useComposerStore((s) => s.selectedModelId);
  const selectModel = useComposerStore((s) => s.selectModel);
  const sliderOverride = useComposerStore((s) => s.sliderOverride);
  const setSliderOverride = useComposerStore((s) => s.setSliderOverride);

  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const runRef = useRef<HTMLButtonElement | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const firstFired = useRef(false);

  const slider: SliderPreset = sliderOverride ?? me.data?.slider ?? chat.data?.slider ?? 'balanced';
  const freeAvailable = (freeUsage.data?.messages ?? 0) < (freeUsage.data?.limit ?? 30);
  const autoFree = me.data?.auto_free_fallback ?? true;
  const currentModelId = selectedModelId ?? chat.data?.current_model_id ?? null;
  const currentModel = useModelLabel(currentModelId);
  const quoteData = quote.data ?? null;
  const quoteFresh = quoteData !== null && lastPrompt === draft.trim();
  const chosenRec = quoteFresh ? (quoteData.recommendations.find((r) => r.model_id === (selectedModelId ?? quoteData.quote.model_id)) ?? quoteData.recommendations[0] ?? null) : null;

  useEffect(() => {
    setPageTitle(chat.data?.title ?? null);
    return () => {
      setPageTitle(null);
    };
  }, [chat.data?.title, setPageTitle]);

  const getQuote = useCallback(
    (prompt: string, modelId: string | null = selectedModelId, preset: SliderPreset = slider) => {
      if (!prompt) return;
      setLastPrompt(prompt);
      quote.mutate(
        { prompt, slider: preset, ...(modelId ? { model_id: modelId } : {}) },
        {
          onError: (err) => {
            if (isApiError(err) && err.code === 'rate_limited') runner.bumpCooldown();
            toast.error('Could not get a quote', isApiError(err) ? err.message : undefined);
          },
        },
      );
    },
    [quote, runner, selectedModelId, slider],
  );

  // PDF: a description is classified and quoted as the first prompt (New chat → ?first=1).
  useEffect(() => {
    if (firstFired.current || params.get('first') !== '1' || !chat.data) return;
    const prompt = useComposerStore.getState().draft.trim();
    if (!prompt) return;
    firstFired.current = true;
    getQuote(prompt, null, slider);
  }, [chat.data, params, getQuote, slider]);

  const startRun = useCallback(
    async (opts: { modelId: string | null; forceFree?: boolean }) => {
      const prompt = draft.trim();
      if (!prompt || !chat.data) return;
      const result = await runner.run({
        prompt,
        quote: quoteData,
        modelId: opts.modelId,
        autoFreeFallback: autoFree,
        freeAvailable,
        ...(opts.forceFree ? { forceFree: true } : {}),
        seq: chat.data.messages.length,
      });
      if (result === 'needs_requote') getQuote(prompt, opts.modelId);
      else if (result === 'free_exhausted') toast.warn('Free messages for today are used up (30/30)');
      else if (result === 'no_allocation') toast.warn('Open an allocation first', 'Tap the wallet to open a $2 allocation.');
      else if (result === 'started') {
        quote.reset();
        setLastPrompt(null);
      }
    },
    [draft, chat.data, runner, quoteData, autoFree, freeAvailable, getQuote, quote],
  );

  const startCompare = async () => {
    const prompt = draft.trim();
    const [l, r] = compareIds;
    if (!prompt || !chat.data || !quoteData || !l || !r) {
      toast.warn('Pick two models to compare');
      return;
    }
    const result = await runner.runCompare({ prompt, quote: quoteData, leftModelId: l, rightModelId: r, seq: chat.data.messages.length });
    if (result === 'needs_requote') getQuote(prompt);
    else if (result === 'no_allocation') toast.warn('Open an allocation first');
    else if (result === 'started') {
      quote.reset();
      setLastPrompt(null);
    }
  };

  const routeAndRun = (modelId: string | null, forceFree = false) => {
    const hud = document.querySelector<HTMLElement>('[data-hud="allocation"]');
    if (compareMode && compareIds[0] && compareIds[1] && !forceFree) {
      drawTrail(runRef.current, [cardRefs.current.get(compareIds[0]) ?? null, cardRefs.current.get(compareIds[1]) ?? null, hud], 'teal');
      void startCompare();
      return;
    }
    const target = modelId ?? quoteData?.recommendations[0]?.model_id ?? null;
    const card = target ? (cardRefs.current.get(target) ?? null) : null;
    drawTrail(runRef.current, [card, hud], forceFree ? 'free' : 'accent');
    void startRun({ modelId, ...(forceFree ? { forceFree } : {}) });
  };

  const onCompareToggle = (modelId: string) => {
    const [l, r] = compareIds;
    if (l === modelId) setCompareModel(0, null);
    else if (r === modelId) setCompareModel(1, null);
    else if (!l) setCompareModel(0, modelId);
    else if (!r) setCompareModel(1, modelId);
    else setCompareModel(1, modelId);
  };

  const pair = runner.compare;
  const leftMsg = pair ? (chat.data?.messages.find((m) => m.id === pair.leftMessageId) ?? null) : null;
  const rightMsg = pair ? (chat.data?.messages.find((m) => m.id === pair.rightMessageId) ?? null) : null;
  const pairDone =
    pair !== null &&
    ['done', 'error'].includes(streamEntries[pair.leftMessageId]?.status ?? '') &&
    ['done', 'error'].includes(streamEntries[pair.rightMessageId]?.status ?? '');

  const onPick = (side: 'left' | 'right') => {
    if (!pair) return;
    const winnerId = side === 'left' ? pair.leftMessageId : pair.rightMessageId;
    const loserId = side === 'left' ? pair.rightMessageId : pair.leftMessageId;
    const winnerModel = side === 'left' ? pair.leftModelId : pair.rightModelId;
    const leftReq = streamEntries[pair.leftMessageId]?.result?.requestId;
    const rightReq = streamEntries[pair.rightMessageId]?.result?.requestId;
    if (leftReq && rightReq) compareVote.mutate({ chat_id: chatId, left_request_id: leftReq, right_request_id: rightReq, pick: side });
    selectModel(winnerModel);
    api.chats.update(chatId, { current_model_id: winnerModel }).catch(() => undefined);
    window.setTimeout(() => {
      cache.remove(loserId);
      useStreamStore.getState().clear(loserId);
      runner.clearCompare();
      clearCompareIds();
      setCompareMode(false);
      winnerId;
    }, 700);
  };

  if (chat.isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-16 w-3/4" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (chat.isError) {
    return <p role="alert" className="text-sm text-signal">Could not load this chat.</p>;
  }

  return (
    <div className="space-y-6">
      <Thread
        messages={chat.data.messages}
        jobs={jobs}
        exclude={pair ? [pair.leftMessageId, pair.rightMessageId] : []}
        onRerunFree={(messageId) => {
          const idx = chat.data.messages.findIndex((m) => m.id === messageId);
          const prev = [...chat.data.messages.slice(0, Math.max(0, idx))].reverse().find((m) => m.role === 'user');
          if (!prev) return;
          void runner.rerunFree(prev.content, chat.data.messages.length, quoteData, freeAvailable);
        }}
      >
        {pair && leftMsg && rightMsg && <CompareSplit left={leftMsg} right={rightMsg} canPick={pairDone} onPick={onPick} />}
        <AnimatePresence>
          {runner.needsTopUp && me.data && (
            <TopUpBar
              key="topup"
              topUpMicro={me.data.allocation}
              toppingUp={topUp.isPending}
              freeAvailable={freeAvailable}
              onTopUp={() => {
                topUp.mutate(me.data.allocation, {
                  onSuccess: () => {
                    runner.clearNeedsTopUp();
                    routeAndRun(selectedModelId);
                  },
                });
              }}
              onContinueFree={() => {
                runner.clearNeedsTopUp();
                routeAndRun(null, true);
              }}
            />
          )}
        </AnimatePresence>
      </Thread>

      <ThreadNotes
        chatTask={chat.data.task_type}
        turnTask={quoteFresh ? quoteData.classification.task_type : null}
        hasSummary={chat.data.summary !== null}
        contextTokens={quoteFresh ? quoteData.quote.context_tokens : null}
      />

      <RecommendationPanel
        data={quoteFresh ? quoteData : null}
        loading={quote.isPending}
        slider={slider}
        onSliderChange={(preset) => {
          setSliderOverride(preset);
          if (lastPrompt) getQuote(lastPrompt, selectedModelId, preset);
        }}
        selectedModelId={selectedModelId ?? quoteData?.quote.model_id ?? null}
        onPick={(modelId) => {
          selectModel(modelId);
          routeAndRun(modelId);
        }}
        onAuto={() => {
          selectModel(null);
          routeAndRun(null);
        }}
        onApplySuggestion={(modelId) => {
          selectModel(modelId);
          if (lastPrompt) getQuote(lastPrompt, modelId);
        }}
        compareMode={compareMode}
        compareIds={compareIds}
        onCompareToggle={onCompareToggle}
        cardRef={(modelId, el) => {
          if (el) cardRefs.current.set(modelId, el);
          else cardRefs.current.delete(modelId);
        }}
      />

      <ModelPicker
        recommendations={quoteFresh ? quoteData.recommendations : []}
        currentModelId={currentModelId}
        onSelect={(modelId) => {
          selectModel(modelId);
          // PDF: switching models updates the chat's current model; the thread continues.
          api.chats.update(chatId, { current_model_id: modelId }).catch(() => undefined);
          if (lastPrompt) getQuote(lastPrompt, modelId);
        }}
      />

      <Composer
        ref={runRef}
        mode="chat"
        quote={chosenRec && quoteData ? { price: chosenRec.price, expiresAt: quoteData.quote.expires_at, isFree: chosenRec.is_free } : null}
        currentModel={currentModel ? { label: currentModel.label, isFree: currentModel.isFree } : null}
        onGetQuote={(prompt) => {
          getQuote(prompt);
        }}
        onRun={() => {
          routeAndRun(selectedModelId);
        }}
        onQuoteExpired={() => {
          if (lastPrompt) getQuote(lastPrompt);
        }}
        disabled={runner.running}
        cooldownKey={runner.cooldownKey}
      />
    </div>
  );
}
