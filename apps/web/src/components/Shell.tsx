import Link from 'next/link';
import type { ReactNode } from 'react';
import { WaveFooter } from './WaveFooter';

export function TopBar({ right }: { right?: ReactNode }) {
  return (
    <header className="top-nav">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 md:px-10">
        <Link href="/" className="flex items-center gap-3">
          <svg width="32" height="32" viewBox="0 0 40 40" className="text-blueprint-cyan wave-sway">
            <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M20 4 L20 36 M4 20 L36 20" stroke="currentColor" strokeWidth="1" opacity="0.6" />
            <path d="M20 8 L24 20 L20 32 L16 20 Z" fill="currentColor" />
          </svg>
          <span className="font-display text-xl font-bold tracking-[0.2em] text-sail-white">
            OCEANDRAFT
          </span>
        </Link>
        <div className="flex items-center gap-4">
          {right ?? (
            <span className="eyebrow hidden md:inline">Marine · Naval · Assessment</span>
          )}
        </div>
      </div>
    </header>
  );
}

export function Shell({
  children,
  topRight,
  hideWaves,
}: {
  children: ReactNode;
  topRight?: ReactNode;
  hideWaves?: boolean;
}) {
  return (
    <div className="shell">
      <TopBar right={topRight} />
      <div className="relative flex-1">{children}</div>
      {!hideWaves && <WaveFooter />}
    </div>
  );
}
