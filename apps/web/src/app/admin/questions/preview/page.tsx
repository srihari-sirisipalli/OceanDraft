'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { SafeMarkdown } from '@/components/SafeMarkdown';
import { api, type ApiError } from '@/lib/api';

// Single payload returned by /admin/questions — carries everything the
// preview walkthrough needs so we never per-navigation-fetch the detail
// endpoint (which trips the global rate limiter).
type Q = {
  id: string;
  title: string;
  isActive: boolean;
  difficulty: string;
  type: 'TEXT' | 'IMAGE' | 'MIXED';
  answerType: 'SINGLE' | 'MULTI';
  ticketNumber: number | null;
  timeLimitSeconds: number | null;
  stemMarkdown: string;
  category: { id: string; name: string; slug: string };
  options: {
    id: string;
    orderIndex: number;
    textMarkdown: string;
    isCorrect: boolean;
  }[];
  primaryMedia: {
    id: string;
    url: string;
    mimeType: string;
    altText: string | null;
    sizeBytes: number;
  } | null;
};

export default function AdminQuestionsPreviewPage() {
  const router = useRouter();
  const search = useSearchParams();
  const [list, setList] = useState<Q[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [activeOnly, setActiveOnly] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // current index, kept in ?index=
  const idx = Math.max(0, parseInt(search?.get('index') ?? '0', 10) || 0);

  // filtered list after client-side filters
  const filtered = useMemo(() => {
    return list.filter((q) => {
      if (activeOnly && !q.isActive) return false;
      if (categoryId && q.category.id !== categoryId) return false;
      return true;
    });
  }, [list, activeOnly, categoryId]);

  const current = filtered[idx] ?? null;

  const setIndex = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(filtered.length - 1, next));
      const params = new URLSearchParams(search?.toString() ?? '');
      params.set('index', String(clamped));
      router.replace(`/admin/questions/preview?${params.toString()}`);
    },
    [filtered.length, router, search],
  );

  // Load the full question set once — includes options, primaryMedia, stem,
  // everything the preview needs. Arrow-key navigation does not refetch.
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await api<{ rows: Q[]; total: number }>(
          '/admin/questions?pageSize=500',
        );
        // Stable ordering: by ticketNumber asc, null-last.
        const sorted = [...r.rows].sort((a, b) => {
          const aT = a.ticketNumber ?? Number.POSITIVE_INFINITY;
          const bT = b.ticketNumber ?? Number.POSITIVE_INFINITY;
          return aT - bT;
        });
        setList(sorted);
      } catch (e) {
        setErr((e as ApiError).message ?? 'Failed to load questions.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Keyboard nav: ← → Home End.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target && (e.target as HTMLElement).closest('input,select,textarea')) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIndex(idx - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIndex(idx + 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setIndex(filtered.length - 1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, filtered.length, setIndex]);

  // All unique categories in the list for the filter dropdown.
  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const q of list) {
      if (!map.has(q.category.id)) {
        map.set(q.category.id, { id: q.category.id, name: q.category.name });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [list]);

  const total = filtered.length;
  const atStart = idx <= 0;
  const atEnd = idx >= total - 1;

  return (
    <div className="space-y-6">
      {/* Header + filters */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Content · Preview</span>
          <h1 className="display-lg mt-2">Question walkthrough</h1>
          <p className="text-sm text-anchor-steel">
            Arrow keys ← → to navigate · Home / End to jump · Sorted by ticket #
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-anchor-steel">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="h-4 w-4 rounded border-blueprint-cyan/50 bg-deep-sea accent-blueprint-cyan"
            />
            Active only
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="input max-w-xs"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Link href="/admin/questions" className="btn-ghost">
            ← Back to list
          </Link>
        </div>
      </div>

      {err && <div className="alert-error">{err}</div>}
      {loading && <div className="alert-info">Loading questions…</div>}

      {!loading && total === 0 && (
        <div className="panel text-center text-anchor-steel">
          No questions match the current filters.
        </div>
      )}

      {!loading && current && (
        <>
          {/* Counter strip + nav controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 panel-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-base text-brass-gold">
                {String(idx + 1).padStart(String(total).length, '0')} / {total}
              </span>
              <span className={current.isActive ? 'pill-green' : 'pill-red'}>
                {current.isActive ? 'ACTIVE' : 'INACTIVE'}
              </span>
              {current.ticketNumber != null && (
                <span className="pill-gold">#{current.ticketNumber}</span>
              )}
              <span className="pill-cyan">{current.category.name}</span>
              <span className="pill-gold">{current.difficulty}</span>
              <span className="pill-cyan">{current.type}</span>
              {current.answerType === 'MULTI' && (
                <span className="pill-gold">MULTI</span>
              )}
              {current.timeLimitSeconds != null && (
                <span className="pill-cyan">{current.timeLimitSeconds}s</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIndex(0)}
                disabled={atStart}
                className="btn-ghost text-sm disabled:opacity-40"
                title="First (Home)"
              >
                ⏮
              </button>
              <button
                onClick={() => setIndex(idx - 1)}
                disabled={atStart}
                className="btn-secondary disabled:opacity-40"
                title="Previous (←)"
              >
                ← Previous
              </button>
              <button
                onClick={() => setIndex(idx + 1)}
                disabled={atEnd}
                className="btn-primary disabled:opacity-40"
                title="Next (→)"
              >
                Next →
              </button>
              <button
                onClick={() => setIndex(total - 1)}
                disabled={atEnd}
                className="btn-ghost text-sm disabled:opacity-40"
                title="Last (End)"
              >
                ⏭
              </button>
            </div>
          </div>

          {/* The candidate-style preview panel */}
          <div className="panel">
            <div
              className={
                current.primaryMedia
                  ? 'grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-8'
                  : ''
              }
            >
              {current.primaryMedia && (
                <figure className="flex flex-col overflow-hidden rounded-xl border border-blueprint-cyan/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={current.primaryMedia.url}
                    alt={current.primaryMedia.altText ?? ''}
                    className="block h-auto w-full"
                    style={{ maxHeight: '70vh', objectFit: 'contain' }}
                  />
                  <figcaption className="bg-deep-sea/80 px-4 py-2 text-xs text-anchor-steel">
                    {(current.primaryMedia.sizeBytes / 1024).toFixed(1)} KB
                    {current.primaryMedia.altText
                      ? ` · ${current.primaryMedia.altText}`
                      : ''}
                  </figcaption>
                </figure>
              )}

              <div className="flex flex-col">
                <h1
                  className="mb-4 font-display font-bold leading-[1.05]"
                  style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.5rem)' }}
                >
                  {current.title}
                </h1>
                <div
                  className="mb-6 leading-relaxed"
                  style={{ fontSize: 'clamp(1.1rem, 1.5vw, 1.5rem)' }}
                >
                  <SafeMarkdown source={current.stemMarkdown} />
                </div>

                {current.answerType === 'MULTI' && (
                  <div className="mb-3 rounded-md bg-brass-gold/15 px-4 py-2.5 text-base text-brass-gold">
                    🗳️ Multi-select — all correct options are marked below.
                  </div>
                )}

                <div className="space-y-3">
                  {current.options.map((o, i) => {
                      const letter = String.fromCharCode(65 + i);
                      return (
                        <div
                          key={o.id}
                          className={`flex items-start gap-4 rounded-xl border-2 p-5 text-lg ${
                            o.isCorrect
                              ? 'border-foam-green/70 bg-foam-green/10'
                              : 'border-blueprint-cyan/15 bg-deep-sea/40'
                          }`}
                        >
                          <span
                            className={`inline-flex h-7 w-7 flex-none items-center justify-center rounded-full border-2 font-mono text-sm ${
                              o.isCorrect
                                ? 'border-foam-green bg-foam-green/20 text-foam-green'
                                : 'border-blueprint-cyan/40 text-blueprint-cyan'
                            }`}
                          >
                            {letter}
                          </span>
                          <div className="flex-1">
                            <SafeMarkdown source={o.textMarkdown} />
                          </div>
                          {o.isCorrect && (
                            <span className="font-mono text-sm text-foam-green">
                              ✓ correct
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom secondary nav for comfort when scrolled */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => setIndex(idx - 1)}
              disabled={atStart}
              className="btn-secondary disabled:opacity-40"
            >
              ← Previous
            </button>
            <Link
              href={`/admin/questions/${current.id}`}
              className="btn-ghost"
            >
              Edit this question ↗
            </Link>
            <button
              onClick={() => setIndex(idx + 1)}
              disabled={atEnd}
              className="btn-primary disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </>
      )}

      {/* Floating edge arrow buttons for quick click navigation */}
      {!loading && total > 0 && (
        <>
          <button
            onClick={() => setIndex(idx - 1)}
            disabled={atStart}
            aria-label="Previous question"
            className="fixed left-4 top-1/2 z-30 -translate-y-1/2 rounded-full border border-blueprint-cyan/40 bg-deep-sea/80 px-4 py-6 text-2xl text-blueprint-cyan shadow-lg backdrop-blur transition hover:border-blueprint-cyan disabled:opacity-30"
          >
            ←
          </button>
          <button
            onClick={() => setIndex(idx + 1)}
            disabled={atEnd}
            aria-label="Next question"
            className="fixed right-4 top-1/2 z-30 -translate-y-1/2 rounded-full border border-brass-gold/40 bg-deep-sea/80 px-4 py-6 text-2xl text-brass-gold shadow-lg backdrop-blur transition hover:border-brass-gold disabled:opacity-30"
          >
            →
          </button>
        </>
      )}
    </div>
  );
}
