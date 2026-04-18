import type { ReactNode } from 'react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <nav className="top-nav">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <svg width="32" height="32" viewBox="0 0 40 40" className="text-blueprint-cyan">
              <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M20 8 L24 20 L20 32 L16 20 Z" fill="currentColor" />
            </svg>
            <div className="flex items-center gap-3">
              <span className="font-display text-xl font-bold tracking-[0.2em]">
                OCEANDRAFT
              </span>
              <span className="pill-gold">BRIDGE</span>
            </div>
          </Link>
          <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-anchor-steel">
            <NavLink href="/admin/dashboard" label="Dashboard" />
            <NavLink href="/admin/questions" label="Questions" />
            <NavLink href="/admin/categories" label="Categories" />
            <NavLink href="/admin/attempts" label="Attempts" />
            <NavLink href="/admin/settings" label="Settings" />
            <NavLink href="/admin/users" label="Admins" />
            <NavLink href="/admin/profile" label="Profile" />
          </div>
        </div>
      </nav>
      <main className="mx-auto w-full max-w-7xl px-6 py-10 md:px-10 md:py-14">{children}</main>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="relative py-1 uppercase tracking-[0.15em] transition hover:text-blueprint-cyan"
    >
      {label}
    </Link>
  );
}
