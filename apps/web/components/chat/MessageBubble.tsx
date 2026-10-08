'use client';

import { clsx } from 'clsx';
import { Receipt } from 'lucide-react';
import { motion } from 'motion/react';

import type { Message } from '@/lib/api/types';
import { formatUsd, micro } from '@/lib/money';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { bubble, withReduced } from '@/lib/motion/variants';

import { useModelLabel } from '@/hooks/useModelLabel';
import { selectEntry, useStreamStore } from '@/stores/streamStore';
import { useUiStore } from '@/stores/uiStore';


import { JobCard } from '@/components/chat/JobCard';
import { MediaCard } from '@/components/chat/MediaCard';
import { StreamText } from '@/components/chat/StreamText';
import { ThumbsFeedback } from '@/components/chat/ThumbsFeedback';
import { MagneticButton } from '@/components/ui/MagneticButton';

export interface MessageBubbleProps {
  message: Message;
  /** Job status when the message is an async job (from `useJob`, Task 23). */
  job?: { status: 'queued' | 'running' | 'done' | 'failed'; result_ref: string | null; error: string | null } | null;
  onRerunFree?: (messageId: string) => void;
}

function ModelTag({ modelId }: { modelId: string | null }) {
  const m = useModelLabel(modelId);
  if (!m) return null;
  return (
    <span className={clsx('num inline-flex items-center gap-1 text-2xs', m.isFree ? 'text-free' : 'text-text-2')}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', m.isFree ? 'bg-free' : 'bg-accent-2')} aria-hidden="true" />
      {m.label}
      {!m.isFree && ' · via MPP'}
    </span>
  );
}

/**
 * One message. Assistant bubbles are driven by the stream store status: streaming (caret),
 * retrying (pulse + "Retrying on X — no extra charge"), error (shake + rerun on free), done.
 */
export function MessageBubble({ message, job = null, onRerunFree }: MessageBubbleProps) {
  const reduced = useReducedMotionSafe();
  const entry = useStreamStore(selectEntry(message.id));
  const openReceipt = useUiStore((s) => s.openReceipt);
  const retryModel = useModelLabel(entry?.retry?.toModelId ?? null);
  const isUser = message.role === 'user';
  const status = entry?.status ?? (message.status === 'error' ? 'error' : 'done');
  const modelId = entry?.modelId ?? message.model_id;
  const requestId = entry?.result?.requestId ?? entry?.requestId ?? message.request_id;
  const file = entry?.file ?? (message.result_ref ? { url: message.result_ref, mime: 'image/jpeg' } : null);
  const jobId = entry?.jobId ?? null;

  if (isUser) {
    return (
      <motion.div variants={withReduced(bubble, reduced)} initial="hidden" animate="done" className="flex justify-end">
        <div className="max-w-[85%] rounded-lg rounded-br-sm bg-accent/20 px-4 py-3 text-base leading-6 whitespace-pre-wrap text-text-0 shadow-hairline">
          {message.content}
          {message.attachments.length > 0 && (
            <ul className="num mt-2 flex flex-wrap gap-2 text-2xs text-text-1">
              {message.attachments.map((a) => (
                <li key={a.url} className="rounded-pill bg-bg-0/40 px-2 py-0.5">
                  {a.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.article
      variants={withReduced(bubble, reduced)}
      initial="hidden"
      animate={status}
      data-status={status}
      className="glass max-w-[92%] rounded-lg rounded-bl-sm px-4 py-3"
      aria-label="Assistant reply"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <ModelTag modelId={modelId} />
        {entry?.retry && (
          <span role="status" className="num text-2xs text-warn">
            Retrying on {retryModel?.label ?? entry.retry.toModelId} — no extra charge
          </span>
        )}
      </div>

      {jobId && job && job.status !== 'done' ? (
        <JobCard jobId={jobId} status={job.status} error={job.error} layoutId={`job-${message.id}`} />
      ) : jobId && job?.status === 'done' && job.result_ref ? (
        <MediaCard url={job.result_ref} mime="audio/mpeg" layoutId={`job-${message.id}`} />
      ) : file ? (
        <MediaCard url={file.url} mime={file.mime} />
      ) : (
        <StreamText messageId={message.id} content={message.content} />
      )}

      {status === 'error' && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-sm text-signal">{entry?.error?.message ?? 'Still failing.'}</p>
          {(entry?.error?.canRerunFree ?? true) && onRerunFree && (
            <MagneticButton
              variant="free"
              size="sm"
              onClick={() => {
                onRerunFree(message.id);
              }}
            >
              Rerun on free model
            </MagneticButton>
          )}
        </div>
      )}

      {status === 'done' && (
        <footer className="mt-3 flex flex-wrap items-center gap-3 text-2xs text-text-2">
          {entry?.result && (
            <span className="num">
              {entry.result.priceMicro === 0 ? 'Free' : formatUsd(micro(entry.result.priceMicro))}
              {entry.result.latencyMs !== null && ` · ${String(Math.round(entry.result.latencyMs / 100) / 10)} s`}
            </span>
          )}
          <ThumbsFeedback messageId={message.id} />
          {requestId && (
            <button
              type="button"
              onClick={() => {
                openReceipt(requestId);
              }}
              className="hit-44 -my-2 inline-flex items-center gap-1 rounded-pill text-text-2 hocus:text-accent-2"
            >
              <Receipt size={14} aria-hidden="true" /> Receipt
            </button>
          )}
        </footer>
      )}
    </motion.article>
  );
}
