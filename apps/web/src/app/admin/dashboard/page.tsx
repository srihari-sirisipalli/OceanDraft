'use client';

import { useEffect, useState } from 'react';
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
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api<{ rows: Row[]; total: number }>(
          '/admin/attempts?page=1&pageSize=10',
        );
        setRows(r.rows);
        setTotal(r.total);
      } catch (e) {
        setErr((e as ApiError).message ?? 'Failed to load');
      }
    })();
  }, []);

  const correct = rows.filter((r) => r.result === 'CORRECT').length;
  const successRate = rows.length ? Math.round((correct / rows.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <h1 className="headline">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Kpi label="Total attempts" value={total} />
        <Kpi label="Shown (latest 10) correct" value={correct} />
        <Kpi label="Success rate (sample)" value={`${successRate}%`} />
      </div>

      {err && <div className="rounded bg-coral-red/20 p-3 text-coral-red">{err}</div>}

      <div className="card overflow-x-auto">
        <h2 className="mb-4 font-display text-xl">Recent attempts</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-anchor-steel">
            <tr>
              <th className="py-2">Mobile</th>
              <th className="py-2">Question</th>
              <th className="py-2">Category</th>
              <th className="py-2">Result</th>
              <th className="py-2">Time</th>
              <th className="py-2">At</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.attemptId} className="border-t border-blueprint-cyan/10">
                <td className="py-2 font-mono">{r.maskedMobile}</td>
                <td className="py-2">{r.questionTitle}</td>
                <td className="py-2">{r.category}</td>
                <td
                  className={`py-2 ${
                    r.result === 'CORRECT' ? 'text-foam-green' : 'text-coral-red'
                  }`}
                >
                  {r.result}
                </td>
                <td className="py-2">
                  {r.timeTakenMs ? `${(r.timeTakenMs / 1000).toFixed(1)}s` : '—'}
                </td>
                <td className="py-2 text-anchor-steel">
                  {r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-anchor-steel">
                  No attempts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-widest text-anchor-steel">{label}</div>
      <div className="mt-2 font-display text-3xl">{value}</div>
    </div>
  );
}
