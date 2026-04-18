import Link from 'next/link';
import type { ReactNode } from 'react';

export function MarineFrame({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-8">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <svg width="36" height="36" viewBox="0 0 40 40" className="text-blueprint-cyan sway">
            <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M20 4 L20 36 M4 20 L36 20" stroke="currentColor" strokeWidth="1" />
            <path d="M20 8 L24 20 L20 32 L16 20 Z" fill="currentColor" opacity="0.85" />
          </svg>
          <span className="font-display text-xl tracking-widest text-sail-white">
            OceanDraft
          </span>
        </Link>
        <span className="font-mono text-xs uppercase tracking-[0.25em] text-anchor-steel">
          Marine · NA Assessment
        </span>
      </header>

      {(title || subtitle) && (
        <div className="mb-6">
          {title && <h1 className="headline">{title}</h1>}
          {subtitle && <p className="small mt-2 max-w-lg">{subtitle}</p>}
        </div>
      )}

      <section className="flex-1">{children}</section>

      <footer className="mt-10 border-t border-blueprint-cyan/20 pt-6 text-center text-xs text-anchor-steel">
        ⚓ Charted with care · V1 · Single-question assessment
      </footer>
    </main>
  );
}
