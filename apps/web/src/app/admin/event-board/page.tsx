'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Board = {
  now: string;
  totalsToday: {
    attempts: number;
    correct: number;
    wrong: number;
    successRate: number;
  };
  latest: {
    id: string;
    mobile: string;
    isGuest: boolean;
    questionTitle: string;
    category: string;
    isCorrect: boolean;
    timeTakenMs: number | null;
    at: string;
  }[];
  byCategory: { name: string; total: number; correct: number; pct: number }[];
  fastestCorrect: {
    ms: number | null;
    mobile: string;
    isGuest: boolean;
    questionTitle: string;
  } | null;
};

export default function EventBoardPage() {
  const [data, setData] = useState<Board | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    let lastIds = new Set<string>();
    async function tick() {
      try {
        const r = await api<Board>('/admin/event/board');
        if (data) {
          const fresh = r.latest.find((a) => !lastIds.has(a.id));
          if (fresh) {
            setFlash(`${fresh.mobile} · ${fresh.isCorrect ? 'HOORAY' : 'Rough seas'}`);
            setTimeout(() => setFlash(null), 3500);
          }
        }
        lastIds = new Set(r.latest.map((a) => a.id));
        setData(r);
      } catch {
        /* ignore */
      }
    }
    tick();
    const t = setInterval(tick, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="shimmer h-3 w-40 rounded-full" />
      </div>
    );
  }

  const maxCat = Math.max(1, ...data.byCategory.map((c) => c.total));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Booth · live</span>
          <h1 className="display-xl mt-2">Event board</h1>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-blueprint-cyan/30 bg-deep-sea/60 px-4 py-1.5 font-mono text-sm text-blueprint-cyan">
          <span className="h-2 w-2 animate-pulse rounded-full bg-foam-green" />
          LIVE · {new Date(data.now).toLocaleTimeString()}
        </div>
      </div>

      {flash && (
        <div className="alert-success animate-pulse text-lg">🎉 {flash}</div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Today" value={data.totalsToday.attempts} big tint="cyan" />
        <Kpi label="Correct" value={data.totalsToday.correct} big tint="green" />
        <Kpi label="Wrong" value={data.totalsToday.wrong} big tint="red" />
        <Kpi
          label="Success rate"
          value={`${data.totalsToday.successRate}%`}
          big
          tint="gold"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="panel md:col-span-2">
          <h2 className="display-md mb-5">Latest attempts</h2>
          <ul className="space-y-2">
            {data.latest.map((r) => (
              <li
                key={r.id}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                  r.isCorrect
                    ? 'border-foam-green/30 bg-foam-green/5'
                    : 'border-coral-red/30 bg-coral-red/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{r.isCorrect ? '⚓' : '⛵'}</span>
                  <div>
                    <div className="font-mono text-sm">
                      {r.isGuest ? r.mobile : r.mobile}
                    </div>
                    <div className="text-xs text-anchor-steel">
                      {r.category} · {r.questionTitle}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {r.timeTakenMs && (
                    <span className="font-mono text-xs text-anchor-steel">
                      {(r.timeTakenMs / 1000).toFixed(1)}s
                    </span>
                  )}
                  <span className={r.isCorrect ? 'pill-green' : 'pill-red'}>
                    {r.isCorrect ? 'CORRECT' : 'WRONG'}
                  </span>
                </div>
              </li>
            ))}
            {data.latest.length === 0 && (
              <li className="py-10 text-center text-anchor-steel">
                No attempts yet today — waiting for the first visitor.
              </li>
            )}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="panel-sm">
            <h3 className="display-md mb-3">Fastest correct</h3>
            {data.fastestCorrect ? (
              <div>
                <div className="font-display text-3xl text-brass-gold">
                  {((data.fastestCorrect.ms ?? 0) / 1000).toFixed(2)}s
                </div>
                <div className="mt-2 font-mono text-sm">
                  {data.fastestCorrect.mobile}
                </div>
                <div className="text-xs text-anchor-steel">
                  {data.fastestCorrect.questionTitle}
                </div>
              </div>
            ) : (
              <div className="text-anchor-steel">No correct answers yet.</div>
            )}
          </div>

          <div className="panel-sm">
            <h3 className="display-md mb-3">By category</h3>
            {data.byCategory.length === 0 ? (
              <div className="text-anchor-steel">Still loading…</div>
            ) : (
              <ul className="space-y-3">
                {data.byCategory.map((c) => (
                  <li key={c.name}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{c.name}</span>
                      <span className="font-mono text-anchor-steel">
                        {c.correct}/{c.total}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-deep-sea/60">
                      <div
                        className="h-full bg-blueprint-cyan"
                        style={{ width: `${(c.total / maxCat) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  tint,
  big,
}: {
  label: string;
  value: number | string;
  tint: 'cyan' | 'green' | 'gold' | 'red';
  big?: boolean;
}) {
  const tintMap: Record<string, string> = {
    cyan: 'from-blueprint-cyan/25 to-blueprint-cyan/5 text-blueprint-cyan',
    green: 'from-foam-green/25 to-foam-green/5 text-foam-green',
    gold: 'from-brass-gold/25 to-brass-gold/5 text-brass-gold',
    red: 'from-coral-red/25 to-coral-red/5 text-coral-red',
  };
  return (
    <div className="relative overflow-hidden rounded-2xl border border-blueprint-cyan/15 bg-hull-navy/50 p-6">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${tintMap[tint]} opacity-30`}
      />
      <div className="relative">
        <div className="eyebrow">{label}</div>
        <div
          className={`mt-3 font-display text-sail-white ${big ? 'text-5xl md:text-6xl' : 'text-4xl'}`}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
