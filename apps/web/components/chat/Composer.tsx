'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';

import { clsx } from 'clsx';
import { GitCompare, Paperclip, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { env } from '@/lib/env';
import type { MicroUsd } from '@/lib/money';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { fadeScale, withReduced } from '@/lib/motion/variants';

import { useComposerStore, type AttachmentRejection } from '@/stores/composerStore';
import { toast } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';

import { ModelPill } from '@/components/chat/ModelPill';
import { RunButton } from '@/components/chat/RunButton';
import { FloatingDock } from '@/components/fx/FloatingDock';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';

export interface ComposerProps {
  /** `new`: no quote yet ("Get quote"); `chat`: run with price + ring. */
  mode: 'new' | 'chat';
  /** Current quote for the draft, if any. */
  quote: { price: MicroUsd; expiresAt: string; isFree: boolean } | null;
  currentModel: { label: string; isFree: boolean } | null;
  onGetQuote: (prompt: string) => void;
  onRun: () => void;
  onQuoteExpired?: () => void;
  disabled?: boolean;
  /** Increment on 429 to shake the dock. */
  cooldownKey?: number;
  /** Inline (dev galleries) instead of fixed to the viewport. */
  floating?: boolean;
  placeholder?: string;
}

const MAX_ROWS = 6;

const rejectionText: Record<AttachmentRejection, string> = {
  type: 'That file type is not supported (images, text or PDF).',
  size: 'That file is too large.',
  count: 'You can attach up to 4 files.',
};

/**
 * The floating composer (design.md §4.3): glass dock that lifts on focus, auto-growing textarea,
 * attachment chips, model pill, Compare toggle (feature-flagged) and the Run button with the live
 * price and quote ring. ⌘/Ctrl+Enter submits.
 */
export const Composer = forwardRef<HTMLButtonElement, ComposerProps>(function Composer(
  {
    mode,
    quote,
    currentModel,
    onGetQuote,
    onRun,
    onQuoteExpired,
    disabled = false,
    cooldownKey = 0,
    floating = true,
    placeholder = 'Describe the task, or continue the conversation…',
  },
  runRef,
) {
  const reduced = useReducedMotionSafe();
  const draft = useComposerStore((s) => s.draft);
  const setDraft = useComposerStore((s) => s.setDraft);
  const attachments = useComposerStore((s) => s.attachments);
  const addAttachment = useComposerStore((s) => s.addAttachment);
  const removeAttachment = useComposerStore((s) => s.removeAttachment);
  const compareMode = useUiStore((s) => s.compareMode);
  const setCompareMode = useUiStore((s) => s.setCompareMode);
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const line = 24;
    el.style.height = `${String(Math.min(el.scrollHeight, line * MAX_ROWS + 16))}px`;
  }, [draft]);

  const canSubmit = draft.trim().length > 0 && !disabled;

  const submit = () => {
    if (!canSubmit) return;
    if (quote) onRun();
    else onGetQuote(draft.trim());
  };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      const rejection = addAttachment(f);
      if (rejection) toast.warn(rejectionText[rejection]);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <FloatingDock focused={focused} shakeKey={cooldownKey} floating={floating} className="overflow-visible">
      <form
        className="flex flex-col gap-2 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <AnimatePresence initial={false}>
          {attachments.length > 0 && (
            <motion.ul
              variants={withReduced(fadeScale, reduced)}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-wrap gap-2"
              aria-label="Attachments"
            >
              {attachments.map((f, i) => (
                <li key={`${f.name}-${String(i)}`}>
                  <Chip tone="neutral" className="h-8 px-2.5 text-xs" onClick={() => { removeAttachment(i); }} aria-label={`Remove ${f.name}`}>
                    <span className="max-w-[10rem] truncate">{f.name}</span>
                    <X size={12} aria-hidden="true" />
                  </Chip>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>

        <textarea
          ref={textareaRef}
          value={draft}
          rows={1}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="Prompt"
          onChange={(e) => {
            setDraft(e.target.value);
          }}
          onFocus={() => {
            setFocused(true);
          }}
          onBlur={() => {
            setFocused(false);
          }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          className="max-h-40 w-full resize-none bg-transparent px-2 py-1.5 text-base leading-6 text-text-0 outline-none placeholder:text-text-2"
        />

        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,text/plain,application/pdf"
            className="sr-only"
            aria-label="Attach files"
            onChange={(e) => {
              onFiles(e.target.files);
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Attach"
            disabled={disabled}
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip size={18} />
          </Button>
          <ModelPill label={currentModel?.label ?? null} isFree={currentModel?.isFree ?? false} auto={mode === 'chat'} />
          {env.flagCompare && mode === 'chat' && (
            <Chip
              tone="teal"
              selected={compareMode}
              className={clsx('h-9 px-3 text-xs', 'hidden sm:inline-flex')}
              onClick={() => {
                setCompareMode(!compareMode);
              }}
              aria-label="Compare two models"
            >
              <GitCompare size={14} aria-hidden="true" />
              Compare
            </Chip>
          )}
          <div className="flex-1" />
          <RunButton
            ref={runRef}
            quote={quote}
            onGetQuote={() => {
              onGetQuote(draft.trim());
            }}
            onRun={onRun}
            {...(onQuoteExpired ? { onQuoteExpired } : {})}
            disabled={!canSubmit}
            size="md"
          />
        </div>
      </form>
    </FloatingDock>
  );
});
