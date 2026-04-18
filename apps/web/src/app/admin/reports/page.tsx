'use client';

import { useEffect, useState } from 'react';
import { api, type ApiError } from '@/lib/api';

type Tab = 'questions' | 'categories' | 'otp';

export default function AdminReportsPage() {
  const [tab, setTab] = useState<Tab>('questions');
  return (
    <div className="space-y-8">
      <div>
        <span className="eyebrow">Insights</span>
        <h1 className="display-lg mt-2">Reports</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        <TabBtn cur={tab} v="questions" onClick={setTab}>
          By question
        </TabBtn>
        <TabBtn cur={tab} v="categories" onClick={setTab}>
          By category
        </TabBtn>
        <TabBtn cur={tab} v="otp" onClick={setTab}>
          OTP delivery
        </TabBtn>
      </div>

      {tab === 'questions' && <QuestionsReport />}
      {tab === 'categories' && <CategoriesReport />}
      {tab === 'otp' && <OtpReport />}
    </div>
  );
}

function TabBtn({
  cur,
  v,
  onClick,
  children,
}: {
  cur: Tab;
  v: Tab;
  onClick: (v: Tab) => void;
  children: React.ReactNode;
}) {
  const active = cur === v;
  return (
    <button
      type="button"
      onClick={() => onClick(v)}
      className={
        active
          ? 'rounded-lg bg-blueprint-cyan px-5 py-2 text-sm font-semibold text-deep-sea'
          : 'rounded-lg border border-blueprint-cyan/30 px-5 py-2 text-sm text-anchor-steel hover:text-sail-white'
      }
    >
      {children}
    </button>
  );
}

type QRow = {
  questionId: string;
  title: string;
  category: string;
  active: boolean;
  total: number;
  correct: number;
  wrong: number;
  correctnessPct: number;
  avgMs: number | null;
};

function QuestionsReport() {
  const [rows, setRows] = useState<QRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await api<{ rows: QRow[] }>('/admin/reports/questions');
        setRows(r.rows);
      } catch (e) {
        setErr((e as ApiError).message);
      }
    })();
  }, []);
  return (
    <div className="panel overflow-x-auto">
      {err && <div className="alert-error mb-4">{err}</div>}
      <table className="tbl">
        <thead>
          <tr>
            <th>Question</th>
            <th>Category</th>
            <th className="text-right">Shown</th>
            <th className="text-right">Correct</th>
            <th className="text-right">Wrong</th>
            <th className="text-right">Correctness</th>
            <th className="text-right">Avg time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.questionId}>
              <td className="max-w-sm truncate">{r.title}</td>
              <td>{r.category}</td>
              <td className="text-right font-mono">{r.total}</td>
              <td className="text-right font-mono text-foam-green">{r.correct}</td>
              <td className="text-right font-mono text-coral-red">{r.wrong}</td>
              <td className="text-right">
                <Bar pct={r.correctnessPct} />
              </td>
              <td className="text-right font-mono">
                {r.avgMs ? `${(r.avgMs / 1000).toFixed(1)}s` : '—'}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="py-6 text-center text-anchor-steel">
                No attempts yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

type CRow = {
  categoryId: string;
  category: string;
  total: number;
  correct: number;
  wrong: number;
  correctnessPct: number;
  avgMs: number | null;
};

function CategoriesReport() {
  const [rows, setRows] = useState<CRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await api<{ rows: CRow[] }>('/admin/reports/categories');
        setRows(r.rows);
      } catch (e) {
        setErr((e as ApiError).message);
      }
    })();
  }, []);
  return (
    <div className="panel overflow-x-auto">
      {err && <div className="alert-error mb-4">{err}</div>}
      <table className="tbl">
        <thead>
          <tr>
            <th>Category</th>
            <th className="text-right">Attempts</th>
            <th className="text-right">Correct</th>
            <th className="text-right">Wrong</th>
            <th className="text-right">Correctness</th>
            <th className="text-right">Avg time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.categoryId}>
              <td className="font-display text-lg">{r.category}</td>
              <td className="text-right font-mono">{r.total}</td>
              <td className="text-right font-mono text-foam-green">{r.correct}</td>
              <td className="text-right font-mono text-coral-red">{r.wrong}</td>
              <td className="text-right">
                <Bar pct={r.correctnessPct} />
              </td>
              <td className="text-right font-mono">
                {r.avgMs ? `${(r.avgMs / 1000).toFixed(1)}s` : '—'}
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
  );
}

type ORow = {
  day: string;
  sent: number;
  failed: number;
  verified: number;
  expired: number;
};

function OtpReport() {
  const [rows, setRows] = useState<ORow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await api<{ rows: ORow[] }>('/admin/reports/otp');
        setRows(r.rows);
      } catch (e) {
        setErr((e as ApiError).message);
      }
    })();
  }, []);
  const maxSent = Math.max(1, ...rows.map((r) => r.sent));
  return (
    <div className="panel overflow-x-auto">
      {err && <div className="alert-error mb-4">{err}</div>}
      <table className="tbl">
        <thead>
          <tr>
            <th>Date</th>
            <th className="text-right">Sent</th>
            <th className="text-right">Verified</th>
            <th className="text-right">Failed</th>
            <th className="text-right">Expired</th>
            <th>Volume</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.day}>
              <td className="font-mono">{r.day}</td>
              <td className="text-right font-mono">{r.sent}</td>
              <td className="text-right font-mono text-foam-green">{r.verified}</td>
              <td className="text-right font-mono text-coral-red">{r.failed}</td>
              <td className="text-right font-mono text-anchor-steel">{r.expired}</td>
              <td>
                <div className="h-2 w-40 overflow-hidden rounded-full bg-deep-sea/60">
                  <div
                    className="h-full bg-blueprint-cyan"
                    style={{ width: `${(r.sent / maxSent) * 100}%` }}
                  />
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-anchor-steel">
                No OTP activity in the last 30 days.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Bar({ pct }: { pct: number }) {
  return (
    <div className="inline-flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-deep-sea/60">
        <div
          className="h-full bg-foam-green"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
      <span className="font-mono text-xs">{pct}%</span>
    </div>
  );
}
