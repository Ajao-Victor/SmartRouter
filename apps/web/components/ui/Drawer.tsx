'use client';

import { useId } from 'react';

import clsx from 'clsx';

import { useIsDesktop } from '@/lib/useMediaQuery';
import { slideRightDrawer, slideUpSheet } from '@/lib/motion/variants';

import { Overlay } from '@/components/ui/Overlay';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Receipt-style drawer: right on desktop, bottom sheet on mobile. z-drawer (30) so a wallet
 * Sheet (40) can open above it.
 */
export function Drawer({ open, onClose, title, children, className }: DrawerProps) {
  const desktop = useIsDesktop();
  const titleId = useId();
  return (
    <Overlay
      open={open}
      onClose={onClose}
      zClass="z-drawer"
      variants={desktop ? slideRightDrawer : slideUpSheet}
      drag={desktop ? 'x' : 'y'}
      layoutClass={desktop ? 'flex justify-end' : 'flex items-end'}
      panelClass={clsx(
        'glass-strong shadow-sheet flex max-h-[88dvh] w-full flex-col overflow-hidden',
        desktop ? 'h-full max-h-full max-w-sm rounded-l-xl' : 'rounded-t-xl',
        className,
      )}
      {...(title ? { labelledBy: titleId } : {})}
    >
      {title && (
        <h2 id={titleId} className="font-display px-5 pt-5 pb-2 text-lg text-text-0">
          {title}
        </h2>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[max(20px,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </Overlay>
  );
}
