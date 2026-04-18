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

export default function AdminAttemptsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'CORRECT' | 'WRONG'>('ALL');

  async function load() {
    try {
      const suffix = filter === 'ALL' ? '' : `&result=${filter}`;
      const r = await api<{ rows: Row[] }>(
        `/admin/attempts?page=1&pageSize=100${suffix}`,
      );
      setRows(r.rows);
    } catch (e) {
      setErr((e as ApiError).message);
    }
  }

  useEffect(() => {
    load();
  }, [filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="headline">Attempts log</h1>
        <select
          className="input max-w-xs"
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'ALL' | 'CORRECT' | 'WRONG')}
        >
          <option value="ALL">All</option>
          <option value="CORRECT">Correct</option>
          <option value="WRONG">Wrong</option>
        </select>
      </div>

      {err && <div className="rounded bg-coral-red/20 p-3 text-coral-red">{err}</div>}

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-anchor-steel">
            <tr>
              <th className="py-2">Mobile</th>
              <th className="py-2">Question</th>
              <th className="py-2">Category</th>
              <th className="py-2">Result</th>
              <th className="py-2">Time</th>
              <th className="py-2">Submitted</th>
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
