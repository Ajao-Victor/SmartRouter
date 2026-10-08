'use client';

import { forwardRef, useImperativeHandle } from 'react';

import { useMagnetic } from '@/lib/motion/useMagnetic';

import { Button, type ButtonProps } from '@/components/ui/Button';

export interface MagneticButtonProps extends ButtonProps {
  /** Max pull in px (design.md: 8). */
  strength?: number;
}

/**
 * Button that leans toward the pointer on magnet springs and snaps back on leave.
 * Pull is zero under reduced motion. Used for Run, Top up, Continue free, Pick.
 */
export const MagneticButton = forwardRef<HTMLButtonElement, MagneticButtonProps>(
  function MagneticButton({ strength = 8, style, onPointerMove, onPointerLeave, ...rest }, ref) {
    const m = useMagnetic({ strength });
    useImperativeHandle(ref, () => m.ref.current as HTMLButtonElement);

    return (
      <Button
        ref={(el) => {
          m.ref.current = el;
        }}
        style={{ ...m.style, ...style }}
        onPointerMove={(e) => {
          m.onPointerMove(e);
          onPointerMove?.(e);
        }}
        onPointerLeave={(e) => {
          m.onPointerLeave();
          onPointerLeave?.(e);
        }}
        {...rest}
      />
    );
  },
);
