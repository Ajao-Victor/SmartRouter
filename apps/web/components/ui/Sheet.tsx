'use client';

import { useId } from 'react';

import { clsx } from 'clsx';

import { useIsDesktop } from '@/lib/useMediaQuery';
import { slideRightDrawer, slideUpSheet } from '@/lib/motion/variants';

import { Overlay } from '@/components/ui/Overlay';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Bottom sheet on mobile (liquid spring, drag down to dismiss, grab handle),
 * right side panel on ≥ lg (heavy spring). Glass surface, z-sheet (40).
 */
export function Sheet({ open, onClose, title, children, className }: SheetProps) {
  const desktop = useIsDesktop();
  const titleId = useId();
  return (
    <Overlay
      open={open}
      onClose={onClose}
      zClass="z-sheet"
      variants={desktop ? slideRightDrawer : slideUpSheet}
      drag={desktop ? 'x' : 'y'}
      layoutClass={desktop ? 'flex justify-end' : 'flex items-end'}
      panelClass={clsx(
        'glass-strong shadow-sheet flex max-h-[92dvh] w-full flex-col overflow-hidden',
        desktop ? 'h-full max-h-full max-w-md rounded-l-xl' : 'rounded-t-xl',
        className,
      )}
      {...(title ? { labelledBy: titleId } : {})}
    >
      {!desktop && (
        <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
          <span className="h-1.5 w-12 rounded-pill bg-line-strong" />
        </div>
      )}
      {title && (
        <h2 id={titleId} className="font-display px-5 pt-3 pb-2 text-xl text-text-0">
          {title}
        </h2>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[max(20px,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </Overlay>
  );
}
