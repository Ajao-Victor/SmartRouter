'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { clsx } from 'clsx';
import { ArrowUp } from 'lucide-react';

import { isApiError } from '@/lib/api/client';
import { TASK_TYPES, type TaskType } from '@/lib/api/types';
import { env } from '@/lib/env';

import { useCreateChat } from '@/hooks/useChats';
import { useMe } from '@/hooks/useMe';
import { useComposerStore } from '@/stores/composerStore';
import { toast } from '@/stores/toastStore';

export const TASK_LABEL: Record<TaskType, string> = {
  chat: 'Chat',
  writing: 'Writing',
  coding: 'Coding',
  research: 'Research',
  translation: 'Translation',
  image: 'Image',
  music: 'Music',
};

export interface NewChatProps {
  /** Preselected category from `?category=` (validated by the page). */
  initialCategory?: TaskType | null;
}

/**
 * PDF "New chat": pick a category or describe the task. `POST /chats { taskType?, description?,
 * slider? }` answers with the chat id and the options for the description, which the workspace
 * shows as the first thing to pick.
 */
export function NewChat({ initialCategory = null }: NewChatProps) {
  const router = useRouter();
  const me = useMe();
  const category = useComposerStore((s) => s.category);
  const setCategory = useComposerStore((s) => s.setCategory);
  const sliderOverride = useComposerStore((s) => s.sliderOverride);
  const [draft, setDraft] = useState('');
  const create = useCreateChat();
  const selected = category ?? initialCategory;
  const description = draft.trim();

  const start = async () => {
    if (!description && !selected) {
      toast.warn('Pick a category or describe the task');
      return;
    }
    const slider = sliderOverride ?? me.data?.slider;
    try {
      const res = await create.mutateAsync({
        ...(selected ? { taskType: selected } : {}),
        ...(description ? { description } : {}),
        ...(slider ? { slider } : {}),
      });
      const composer = useComposerStore.getState();
      composer.setDraft('');
      composer.selectModel(null);
      composer.setPendingOptions(description && res.options.length > 0 ? { chatId: res.chatId, prompt: description, options: res.options } : null);
      if (description && res.options.length === 0) composer.setDraft(description);
      router.push(`/chat/${res.chatId}`);
    } catch (err) {
      toast.error('Could not start the chat', isApiError(err) ? err.message : undefined);
    }
  };

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-text-0 sm:text-3xl">What do you want done?</h1>
        <p className="text-sm text-text-2">Describe the task. SmartRouter quotes the best models for it before anything runs.</p>
      </div>

      <form
        className="rounded-xl bg-bg-1 shadow-hairline-strong transition-[box-shadow] focus-within:shadow-glow-accent"
        onSubmit={(e) => {
          e.preventDefault();
          void start();
        }}
      >
        <textarea
          aria-label="Describe the task"
          placeholder="Write a cover letter for a payments engineer role at Paystack…"
          value={draft}
          rows={3}
          onChange={(e) => {
            setDraft(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void start();
            }
          }}
          className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-base leading-6 text-text-0 outline-none placeholder:text-text-2"
        />
        <div className="flex items-center justify-between gap-3 px-2 pb-2">
          <p className="px-2 text-xs text-text-2">{description ? 'You pick the model next — nothing runs before you see the price.' : 'Or just pick a category below.'}</p>
          <button
            type="submit"
            disabled={create.isPending || (!description && !selected)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-medium text-text-inverse transition-colors hocus:bg-accent-hi disabled:cursor-not-allowed disabled:opacity-40"
          >
            {create.isPending ? 'Starting…' : description ? 'Get options' : 'Start chat'}
            <ArrowUp size={16} aria-hidden="true" />
          </button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2" aria-label="Task categories">
        {TASK_TYPES.filter((t) => t !== 'music' || env.flagMusic).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={selected === t}
            onClick={() => {
              setCategory(selected === t ? null : t);
            }}
            className={clsx(
              'h-9 rounded-pill px-3.5 text-sm transition-colors',
              selected === t ? 'bg-accent/20 text-text-0 shadow-hairline-strong' : 'bg-bg-1 text-text-1 shadow-hairline hocus:bg-bg-2 hocus:text-text-0',
            )}
          >
            {TASK_LABEL[t]}
          </button>
        ))}
      </div>
    </section>
  );
}
