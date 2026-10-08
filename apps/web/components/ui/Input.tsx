'use client';

import { forwardRef, useId } from 'react';

import { clsx } from 'clsx';
import { motion } from 'motion/react';

import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { shake, withReduced } from '@/lib/motion/variants';

interface FieldChromeProps {
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
}

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'>,
    FieldChromeProps {}

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>,
    FieldChromeProps {}

const fieldClass =
  'glass w-full rounded-md px-4 text-base text-text-0 placeholder:text-text-2 transition-[box-shadow] duration-200 focus:outline-none focus:shadow-glow-accent disabled:opacity-50';

function Chrome({
  id,
  label,
  hint,
  error,
  className,
  children,
}: FieldChromeProps & { id: string; children: React.ReactNode }) {
  const reduced = useReducedMotionSafe();
  return (
    <motion.div
      className={clsx('flex flex-col gap-1.5', className)}
      variants={withReduced(shake, reduced)}
      animate={error ? 'shake' : 'idle'}
      key={error ?? 'ok'}
    >
      {label && (
        <label htmlFor={id} className="num text-2xs tracking-wider-ui text-text-2 uppercase">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-signal">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-text-2">
          {hint}
        </p>
      ) : null}
    </motion.div>
  );
}

/** Glass text input with focus glow; shakes on error. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, id: idProp, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const chrome = { ...(label ? { label } : {}), ...(hint ? { hint } : {}), ...(error ? { error } : {}) };
  return (
    <Chrome id={id} {...chrome} {...(className ? { className } : {})}>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={clsx(fieldClass, 'h-11', error && 'shadow-glow-signal')}
        {...rest}
      />
    </Chrome>
  );
});

/** Glass textarea with focus glow; shakes on error. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, id: idProp, rows = 3, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const chrome = { ...(label ? { label } : {}), ...(hint ? { hint } : {}), ...(error ? { error } : {}) };
  return (
    <Chrome id={id} {...chrome} {...(className ? { className } : {})}>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={clsx(fieldClass, 'resize-none py-3', error && 'shadow-glow-signal')}
        {...rest}
      />
    </Chrome>
  );
});
