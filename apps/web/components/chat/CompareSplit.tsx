'use client';

import { useState } from 'react';

import { clsx } from 'clsx';

import type { Message } from '@/lib/api/types';

import { MessageBubble } from '@/components/chat/MessageBubble';

export interface CompareSplitProps {
  left: Message;
  right: Message;
  /** Picking is enabled once both answers are done. */
  canPick: boolean;
  onPick: (side: 'left' | 'right') => void;
}

/** PDF Compare: two answers side by side; the pick is sent to `POST /compare/vote`. */
export function CompareSplit({ left, right, canPick, onPick }: CompareSplitProps) {
  const [picked, setPicked] = useState<'left' | 'right' | null>(null);

  return (
    <div className="grid gap-4 md:grid-cols-2" aria-label="Compare two models">
      {(['left', 'right'] as const).map((side) => {
        const msg = side === 'left' ? left : right;
        const loser = picked !== null && picked !== side;
        if (loser) return null;
        return (
          <div key={side} className={clsx('space-y-3 rounded-xl bg-bg-1 p-4 shadow-hairline', picked === side && 'md:col-span-2')}>
            <MessageBubble message={msg} />
            {picked === null && (
              <button
                type="button"
                disabled={!canPick}
                onClick={() => {
                  setPicked(side);
                  onPick(side);
                }}
                className="rounded-lg bg-bg-2 px-3 py-1.5 text-sm font-medium text-text-0 transition-colors hocus:bg-bg-3 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Pick this one
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
