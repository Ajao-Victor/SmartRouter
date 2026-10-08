'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { motion } from 'motion/react';

import { isApiError } from '@/lib/api/client';
import { TASK_TYPES, type TaskType } from '@/lib/api/types';
import { env } from '@/lib/env';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { fadeUp, stagger, withReduced } from '@/lib/motion/variants';

import { useCreateChat } from '@/hooks/useChats';
import { useComposerStore } from '@/stores/composerStore';
import { toast } from '@/stores/toastStore';


import { burstAt, useParticleBurst } from '@/components/fx/ParticleBurst';
import { Chip } from '@/components/ui/Chip';
import { Textarea } from '@/components/ui/Input';
import { MagneticButton } from '@/components/ui/MagneticButton';

const LABEL: Record<TaskType, string> = {
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
 * PDF "New chat": pick a category (chat, writing, coding, research, translation, image, music)
 * or describe the task. A description is classified and quoted as the first prompt, so the
 * user can run it straight away — we navigate with `?first=1` and the workspace auto-quotes.
 */
export function NewChat({ initialCategory = null }: NewChatProps) {
  const router = useRouter();
  const reduced = useReducedMotionSafe();
  const burst = useParticleBurst();
  const category = useComposerStore((s) => s.category);
  const setCategory = useComposerStore((s) => s.setCategory);
  const [draft, setDraft] = useState('');
  const create = useCreateChat();
  const selected = category ?? initialCategory;

  const start = async (e?: { clientX: number; clientY: number }) => {
    const prompt = draft.trim();
    if (!prompt && !selected) {
      toast.warn('Pick a category or describe the task');
      return;
    }
    try {
      const chat = await create.mutateAsync({
        ...(selected ? { task_type: selected } : {}),
        ...(prompt ? { first_prompt: prompt } : {}),
      });
      if (e) burst(burstAt(e, '#19E6C1', 60));
      useComposerStore.getState().setDraft(prompt);
      router.push(prompt ? `/chat/${chat.id}?first=1` : `/chat/${chat.id}`);
    } catch (err) {
      toast.error('Could not start the chat', isApiError(err) ? err.message : undefined);
    }
  };

  return (
    <motion.section
      variants={withReduced(stagger({ each: 0.06 }), reduced)}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      <motion.div variants={withReduced(fadeUp, reduced)} className="space-y-1">
        <p className="num text-2xs tracking-label text-text-2 uppercase">New chat</p>
        <h1 className="font-display text-display-sm text-text-0">
          What do you want <span className="text-beam">done</span>?
        </h1>
      </motion.div>

      <motion.div variants={withReduced(fadeUp, reduced)} className="flex flex-wrap gap-2" aria-label="Task categories">
        {TASK_TYPES.filter((t) => t !== 'music' || env.flagMusic).map((t) => (
          <Chip
            key={t}
            tone={t === 'research' ? 'teal' : 'accent'}
            selected={selected === t}
            onClick={() => {
              setCategory(selected === t ? null : t);
            }}
          >
            {LABEL[t]}
          </Chip>
        ))}
      </motion.div>

      <motion.div variants={withReduced(fadeUp, reduced)} className="space-y-3">
        <Textarea
          label="Or describe the task"
          placeholder="Write a cover letter for a payments engineer role at Paystack…"
          value={draft}
          rows={3}
          onChange={(e) => {
            setDraft(e.target.value);
          }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              void start();
            }
          }}
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-text-2">
            {draft.trim() ? 'Your description is classified and quoted as the first prompt.' : 'Pick a category, or describe it and we classify it for you.'}
          </p>
          <MagneticButton
            size="md"
            loading={create.isPending}
            onClick={(e) => {
              void start(e);
            }}
          >
            {draft.trim() ? 'Get a quote' : 'Start chat'}
          </MagneticButton>
        </div>
      </motion.div>
    </motion.section>
  );
}
