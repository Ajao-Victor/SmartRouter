'use client';

import { motion } from 'motion/react';

import { RouterOrb } from '@/components/fx/RouterOrb';

export interface JobCardProps {
  jobId: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  /** Shared with MediaCard for the morph. */
  layoutId?: string;
  error?: string | null;
}

const copy = { queued: 'Queued… (worker)', running: 'Generating… (worker)', done: 'Finishing…', failed: 'Generation failed' } as const;

/** PDF: Suno and StableStudio jobs finish in the worker and the app polls them. */
export function JobCard({ jobId, status, layoutId, error }: JobCardProps) {
  return (
    <motion.div
      {...(layoutId ? { layoutId } : {})}
      role="status"
      aria-live="polite"
      className="glass inline-flex items-center gap-3 rounded-pill py-2 pr-5 pl-2"
    >
      <RouterOrb size={36} activity={status === 'failed' ? 0 : 0.8} />
      <span className="text-sm text-text-0">
        {status === 'failed' ? (error ?? copy.failed) : copy[status]}
        {status !== 'failed' && <span className="num text-text-2"> · {jobId}</span>}
      </span>
    </motion.div>
  );
}
