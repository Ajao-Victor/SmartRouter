'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { clsx } from 'clsx';
import { Activity, Plus, Settings } from 'lucide-react';

export interface TopBarProps {
  /** Chat title. */
  title?: string | null;
  /** Right-side slot (allocation HUD). */
  right?: React.ReactNode;
  className?: string;
}

const NAV = [
  { href: '/chat', label: 'New chat', icon: Plus },
  { href: '/activity', label: 'Activity', icon: Activity },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

/** Sticky, quiet top bar: wordmark, chat title, three links and the HUD slot. */
export function TopBar({ title, right, className }: TopBarProps) {
  const pathname = usePathname();
  return (
    <header className={clsx('sticky top-0 z-content flex h-14 items-center gap-3 border-b border-line bg-bg-0/90 px-3 backdrop-blur-sm sm:px-4', className)}>
      <Link href="/" className="flex shrink-0 items-center gap-2 rounded-md pr-1 text-base font-semibold text-text-0" aria-label="SmartRouter home">
        <span className="h-2.5 w-2.5 rounded-full bg-accent-2" aria-hidden="true" />
        <span className="font-display hidden sm:inline">SmartRouter</span>
      </Link>
      <div className="min-w-0 flex-1 truncate text-center text-sm text-text-1 sm:text-left">{title ?? null}</div>
      <nav className="flex shrink-0 items-center gap-0.5" aria-label="Primary">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={clsx(
                'inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm transition-colors hocus:bg-bg-2 hocus:text-text-0',
                active ? 'text-text-0' : 'text-text-1',
              )}
            >
              <Icon size={16} aria-hidden="true" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          );
        })}
      </nav>
      {right && <div className="flex shrink-0 items-center">{right}</div>}
    </header>
  );
}
