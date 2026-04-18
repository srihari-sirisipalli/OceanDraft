import type { ReactNode } from 'react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <nav className="border-b border-blueprint-cyan/20 bg-hull-navy/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <span className="font-display text-lg tracking-widest">OceanDraft</span>
            <span className="rounded bg-blueprint-cyan/20 px-2 py-0.5 font-mono text-xs uppercase">
              Bridge
            </span>
          </Link>
          <div className="flex gap-4 font-mono text-xs uppercase tracking-widest text-anchor-steel">
            <Link href="/admin/dashboard" className="hover:text-blueprint-cyan">
              Dashboard
            </Link>
            <Link href="/admin/questions" className="hover:text-blueprint-cyan">
              Questions
            </Link>
            <Link href="/admin/attempts" className="hover:text-blueprint-cyan">
              Attempts
            </Link>
            <Link href="/admin/settings" className="hover:text-blueprint-cyan">
              Settings
            </Link>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
