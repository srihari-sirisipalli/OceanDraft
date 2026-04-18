'use client';

import { useEffect, useState } from 'react';
import { api, type ApiError } from '@/lib/api';

type Q = {
  id: string;
  title: string;
  isActive: boolean;
  difficulty: string;
  category: { name: string };
  options: { id: string; textMarkdown: string; isCorrect: boolean }[];
};

export default function AdminQuestionsPage() {
  const [rows, setRows] = useState<Q[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await api<{ rows: Q[]; total: number }>('/admin/questions?pageSize=50');
      setRows(r.rows);
    } catch (e) {
      setErr((e as ApiError).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(q: Q) {
    try {
      await api(`/admin/questions/${q.id}/${q.isActive ? 'deactivate' : 'activate'}`, {
        method: 'PATCH',
      });
      load();
    } catch (e) {
      setErr((e as ApiError).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="headline">Questions</h1>
        <span className="small">Create/Edit UI is scaffolded — use the API for now.</span>
      </div>

      {err && <div className="rounded bg-coral-red/20 p-3 text-coral-red">{err}</div>}
      {loading && <div className="small">Loading…</div>}

      <div className="space-y-3">
        {rows.map((q) => (
          <div key={q.id} className="card flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg">{q.title}</span>
                <span className="rounded bg-blueprint-cyan/10 px-2 py-0.5 font-mono text-xs uppercase">
                  {q.category.name}
                </span>
                <span className="rounded bg-blueprint-cyan/10 px-2 py-0.5 font-mono text-xs">
                  {q.difficulty}
                </span>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-sail-white/80">
                {q.options.map((o) => (
                  <li key={o.id}>
                    {o.isCorrect ? '✅ ' : '• '}
                    {o.textMarkdown}
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => toggle(q)}
              className={q.isActive ? 'btn-secondary' : 'btn-primary'}
            >
              {q.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
