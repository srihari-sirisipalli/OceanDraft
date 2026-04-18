import type { ReactNode } from 'react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <nav className="top-nav">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-5 py-3 md:flex-row md:items-center md:justify-between md:gap-6 md:px-10 md:py-4">
          {/* Brand — logo + BRIDGE pill stay locked together on one row */}
          <Link
            href="/admin/dashboard"
            className="flex flex-shrink-0 items-center gap-3"
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 40 40"
              className="text-blueprint-cyan"
            >
              <circle
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path d="M20 8 L24 20 L20 32 L16 20 Z" fill="currentColor" />
            </svg>
            <span className="font-display text-lg font-bold tracking-[0.2em] md:text-xl">
              OCEANDRAFT
            </span>
            <span className="pill-gold">BRIDGE</span>
          </Link>

          {/* Nav — scrolls horizontally on mobile, wraps on desktop.
              The logo sits on its own row on mobile so the BRIDGE pill
              never ends up sandwiched between two wrapped nav rows. */}
          <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:flex-1 md:overflow-visible md:px-0">
            <div className="flex min-w-max items-center gap-5 text-xs font-semibold text-anchor-steel md:min-w-0 md:flex-wrap md:justify-end md:gap-x-6 md:gap-y-1 md:text-sm">
              <NavLink href="/admin/event-board" label="Event" />
              <NavLink href="/admin/dashboard" label="Dashboard" />
              <NavLink href="/admin/questions" label="Questions" />
              <NavLink href="/admin/categories" label="Categories" />
              <NavLink href="/admin/attempts" label="Attempts" />
              <NavLink href="/admin/reports" label="Reports" />
              <NavLink href="/admin/templates" label="Templates" />
              <NavLink href="/admin/settings" label="Settings" />
              <NavLink href="/admin/users" label="Admins" />
              <NavLink href="/admin/profile" label="Profile" />
            </div>
          </div>
        </div>
      </nav>
      <main className="mx-auto w-full max-w-7xl px-5 py-8 md:px-10 md:py-12">
        {children}
      </main>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="whitespace-nowrap uppercase tracking-[0.15em] transition hover:text-blueprint-cyan"
    >
      {label}
    </Link>
  );
}
