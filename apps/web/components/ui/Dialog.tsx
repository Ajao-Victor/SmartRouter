'use client';

import { useId } from 'react';

import { clsx } from 'clsx';

import { dialog as dialogVariants } from '@/lib/motion/variants';

import { Overlay } from '@/components/ui/Overlay';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/** Centred glass dialog: blur-in on a snappy spring, hairline + accent glow. z-sheet (40). */
export function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
  const titleId = useId();
  return (
    <Overlay
      open={open}
      onClose={onClose}
      zClass="z-sheet"
      variants={dialogVariants}
      layoutClass="flex items-center justify-center p-4"
      panelClass={clsx('glass-strong w-full max-w-md rounded-xl p-6 shadow-glow-accent', className)}
      {...(title ? { labelledBy: titleId } : {})}
    >
      {title && (
        <h2 id={titleId} className="font-display text-xl text-text-0">
          {title}
        </h2>
      )}
      {description && <p className="mt-1 text-sm text-text-1">{description}</p>}
      <div className={clsx(title || description ? 'mt-5' : '')}>{children}</div>
    </Overlay>
  );
}
