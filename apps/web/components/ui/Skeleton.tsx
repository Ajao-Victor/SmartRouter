import { clsx } from 'clsx';

export interface SkeletonProps {
  className?: string;
  /** Rounded pill (chips, buttons) instead of card radius. */
  pill?: boolean;
}

/** Loading placeholder: glass block with a hairline shimmer sweep. */
export function Skeleton({ className, pill = false }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={clsx('shimmer-line bg-bg-2/70 shadow-hairline', pill ? 'rounded-pill' : 'rounded-md', className)}
    />
  );
}
