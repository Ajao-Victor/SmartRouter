'use client';

import { useState } from 'react';

import { clsx } from 'clsx';
import { ThumbsDown, ThumbsUp } from 'lucide-react';

import { useFeedback } from '@/hooks/useFeedback';
import { toast } from '@/stores/toastStore';

/** Thumbs up/down under an answer → `POST /feedback { requestId, rating: 1 | -1 }`. */
export function ThumbsFeedback({ requestId }: { requestId: string }) {
  const feedback = useFeedback();
  const [vote, setVote] = useState<1 | -1 | null>(null);

  const send = (rating: 1 | -1) => {
    if (vote === rating) return;
    setVote(rating);
    feedback.mutate(
      { requestId, rating },
      {
        onError: () => {
          setVote(null);
          toast.warn('Could not save your feedback');
        },
      },
    );
  };

  return (
    <span className="inline-flex items-center gap-0.5" aria-label="Rate this reply">
      {([1, -1] as const).map((rating) => (
        <button
          key={rating}
          type="button"
          aria-label={rating === 1 ? 'Good answer' : 'Bad answer'}
          aria-pressed={vote === rating}
          onClick={() => {
            send(rating);
          }}
          className={clsx(
            'flex h-7 w-7 items-center justify-center rounded-md text-text-2 transition-colors hocus:bg-bg-2 hocus:text-text-0',
            vote === rating && (rating === 1 ? 'text-accent-2' : 'text-signal'),
          )}
        >
          {rating === 1 ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />}
        </button>
      ))}
    </span>
  );
}
