'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type ApiError } from '@/lib/api';

type Row = {
  attemptId: string;
  maskedMobile: string;
  questionTitle: string;
  category: string;
  result: 'CORRECT' | 'WRONG';
  timeTakenMs: number | null;
  submittedAt: string | null;
};

export default function AdminDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [qCount, setQCount] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [r, q] = await Promise.all([
          api<{ rows: Row[]; total: number }>('/admin/attempts?page=1&pageSize=10'),
          api<{ total: number }>('/admin/questions?pageSize=1'),
        ]);
        setRows(r.rows);
        setTotal(r.total);
        setQCount(q.total);
      } catch (e) {
        setErr((e as ApiError).message ?? 'Failed to load');
      }
    })();
  }, []);

  const correct = rows.filter((r) => r.result === 'CORRECT').length;
  const sampleRate = rows.length ? Math.round((correct / rows.length) * 100) : 0;
  const avgSec = rows.length
    ? (
        rows.reduce((s, r) => s + (r.timeTakenMs ?? 0), 0) /
        rows.length /
        1000
      ).toFixed(1)
    : '—';

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Overview</span>
          <h1 className="display-lg mt-2">Dashboard</h1>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/questions/new" className="btn-primary">
            + New question
          </Link>
          <Link href="/admin/attempts" className="btn-secondary">
            View attempts
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Total attempts" value={total} tint="cyan" />
        <Kpi label="Questions" value={qCount ?? '—'} tint="gold" />
        <Kpi label="Recent success %" value={`${sampleRate}%`} tint="green" />
        <Kpi label="Avg time (latest 10)" value={`${avgSec}s`} tint="cyan" />
      </div>

      {err && <div className="alert-error">{err}</div>}

      <div className="panel">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="display-md">Recent attempts</h2>
          <Link href="/admin/attempts" className="btn-ghost">
            See all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Mobile</th>
                <th>Question</th>
                <th>Category</th>
                <th>Result</th>
                <th>Time</th>
                <th>Submitted</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.attemptId}>
                  <td className="font-mono">{r.maskedMobile}</td>
                  <td className="max-w-xs truncate">{r.questionTitle}</td>
                  <td>{r.category}</td>
                  <td>
                    <span
                      className={
                        r.result === 'CORRECT' ? 'pill-green' : 'pill-red'
                      }
                    >
                      {r.result}
                    </span>
                  </td>
                  <td>
                    {r.timeTakenMs ? `${(r.timeTakenMs / 1000).toFixed(1)}s` : '—'}
                  </td>
                  <td className="text-anchor-steel">
                    {r.submittedAt
                      ? new Date(r.submittedAt).toLocaleString()
                      : '—'}
                  </td>
                  <td>
                    <Link
                      href={`/admin/attempts/${r.attemptId}`}
                      className="btn-ghost text-xs"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-anchor-steel">
                    No attempts yet — share the candidate URL.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  tint,
}: {
  label: string;
  value: number | string;
  tint: 'cyan' | 'green' | 'gold';
}) {
  const tintMap: Record<string, string> = {
    cyan: 'from-blueprint-cyan/25 to-blueprint-cyan/5 text-blueprint-cyan',
    green: 'from-foam-green/25 to-foam-green/5 text-foam-green',
    gold: 'from-brass-gold/25 to-brass-gold/5 text-brass-gold',
  };
  return (
    <div className="relative overflow-hidden rounded-2xl border border-blueprint-cyan/15 bg-hull-navy/50 p-6">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${tintMap[tint]} opacity-30`}
      />
      <div className="relative">
        <div className="eyebrow">{label}</div>
        <div className="mt-3 font-display text-4xl text-sail-white">{value}</div>
      </div>
    </div>
  );
}
