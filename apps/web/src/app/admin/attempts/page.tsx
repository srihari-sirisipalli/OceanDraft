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

export default function AdminAttemptsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'CORRECT' | 'WRONG'>('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [resetMobile, setResetMobile] = useState('');
  const [resetReason, setResetReason] = useState('');
  const [resetting, setResetting] = useState(false);

  async function load() {
    const params = new URLSearchParams({ page: '1', pageSize: '200' });
    if (filter !== 'ALL') params.set('result', filter);
    if (from) params.set('from', new Date(from).toISOString());
    if (to) params.set('to', new Date(to).toISOString());
    try {
      const r = await api<{ rows: Row[] }>(`/admin/attempts?${params}`);
      setRows(r.rows);
    } catch (e) {
      setErr((e as ApiError).message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  function exportFile(format: 'csv' | 'xlsx') {
    const params = new URLSearchParams({ format });
    if (filter !== 'ALL') params.set('result', filter);
    if (from) params.set('from', new Date(from).toISOString());
    if (to) params.set('to', new Date(to).toISOString());
    window.location.href = `/api/v1/admin/attempts/export?${params}`;
  }

  async function doReset(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    if (!resetMobile.trim() || !resetReason.trim()) {
      setErr('Mobile and reason required.');
      return;
    }
    setResetting(true);
    try {
      const r = await api<{ mobile: string; resetCount: number }>(
        '/admin/attempts/reset',
        {
          method: 'POST',
          body: JSON.stringify({ mobile: resetMobile.trim(), reason: resetReason.trim() }),
        },
      );
      setInfo(`Reset ${r.resetCount} attempt(s) for ${r.mobile}.`);
      setResetMobile('');
      setResetReason('');
      load();
    } catch (e) {
      setErr((e as ApiError).message);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Activity</span>
          <h1 className="display-lg mt-2">Attempts log</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="input max-w-xs"
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'ALL' | 'CORRECT' | 'WRONG')}
          >
            <option value="ALL">All results</option>
            <option value="CORRECT">Correct only</option>
            <option value="WRONG">Wrong only</option>
          </select>
          <input
            type="date"
            className="input max-w-xs"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="From"
          />
          <input
            type="date"
            className="input max-w-xs"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="To"
          />
          <button onClick={load} className="btn-secondary">
            Apply
          </button>
          <button onClick={() => exportFile('csv')} className="btn-secondary">
            ⇣ CSV
          </button>
          <button onClick={() => exportFile('xlsx')} className="btn-secondary">
            ⇣ Excel
          </button>
        </div>
      </div>

      {err && <div className="alert-error">{err}</div>}
      {info && <div className="alert-success">{info}</div>}

      <form onSubmit={doReset} className="panel-sm grid grid-cols-1 gap-3 md:grid-cols-4">
        <div>
          <label className="label">Reset attempts for mobile</label>
          <input
            value={resetMobile}
            onChange={(e) => setResetMobile(e.target.value)}
            className="input"
            placeholder="+919876543210"
          />
        </div>
        <div className="md:col-span-2">
          <label className="label">Reason (audited)</label>
          <input
            value={resetReason}
            onChange={(e) => setResetReason(e.target.value)}
            className="input"
            placeholder="Candidate requested re-attempt after tech issue"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={resetting}
            className="btn-primary w-full"
          >
            {resetting ? 'Resetting…' : 'Reset'}
          </button>
        </div>
      </form>

      <div className="panel overflow-x-auto">
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
                <td className="max-w-sm truncate">{r.questionTitle}</td>
                <td>{r.category}</td>
                <td>
                  <span className={r.result === 'CORRECT' ? 'pill-green' : 'pill-red'}>
                    {r.result}
                  </span>
                </td>
                <td>
                  {r.timeTakenMs ? `${(r.timeTakenMs / 1000).toFixed(1)}s` : '—'}
                </td>
                <td className="text-anchor-steel">
                  {r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '—'}
                </td>
                <td className="text-right">
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
                  No attempts match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
