'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type ApiError } from '@/lib/api';

type Q = {
  id: string;
  title: string;
  isActive: boolean;
  difficulty: string;
  type: string;
  category: { name: string };
  options: { id: string; textMarkdown: string; isCorrect: boolean }[];
};

export default function AdminQuestionsPage() {
  const [rows, setRows] = useState<Q[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    try {
      const r = await api<{ rows: Q[]; total: number }>(
        `/admin/questions?pageSize=100${search ? `&search=${encodeURIComponent(search)}` : ''}`,
      );
      setRows(r.rows);
    } catch (e) {
      setErr((e as ApiError).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggle(q: Q) {
    try {
      await api(
        `/admin/questions/${q.id}/${q.isActive ? 'deactivate' : 'activate'}`,
        { method: 'PATCH' },
      );
      load();
    } catch (e) {
      setErr((e as ApiError).message);
    }
  }

  async function remove(q: Q) {
    if (!confirm(`Delete "${q.title}"? This can't be undone.`)) return;
    try {
      await api(`/admin/questions/${q.id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setErr((e as ApiError).message);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Content</span>
          <h1 className="display-lg mt-2">Questions</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            placeholder="Search title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            className="input max-w-xs"
          />
          <button onClick={load} className="btn-secondary">
            Search
          </button>
          <Link href="/admin/questions/new" className="btn-primary">
            + New question
          </Link>
        </div>
      </div>

      {err && <div className="alert-error">{err}</div>}
      {loading && <div className="alert-info">Loading…</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {rows.map((q) => (
          <div key={q.id} className="panel-sm flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={q.isActive ? 'pill-green' : 'pill-red'}>
                    {q.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  <span className="pill-cyan">{q.category.name}</span>
                  <span className="pill-gold">{q.difficulty}</span>
                  <span className="pill-cyan">{q.type}</span>
                </div>
                <h3 className="mt-2 font-display text-xl text-sail-white">
                  {q.title}
                </h3>
              </div>
            </div>
            <ul className="space-y-1 text-sm text-sail-white/80">
              {q.options.map((o) => (
                <li key={o.id} className="flex items-start gap-2">
                  <span className={o.isCorrect ? 'text-foam-green' : 'text-anchor-steel'}>
                    {o.isCorrect ? '✓' : '•'}
                  </span>
                  <span>{o.textMarkdown}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <Link href={`/admin/questions/${q.id}`} className="btn-secondary text-sm">
                Edit
              </Link>
              <button
                onClick={() => toggle(q)}
                className={q.isActive ? 'btn-ghost text-sm' : 'btn-primary text-sm'}
              >
                {q.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button onClick={() => remove(q)} className="btn-ghost text-sm text-coral-red">
                Delete
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && !loading && (
          <div className="panel md:col-span-2 text-center text-anchor-steel">
            No questions yet — create your first one.
          </div>
        )}
      </div>
    </div>
  );
}
