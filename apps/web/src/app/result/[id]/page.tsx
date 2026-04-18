'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MarineFrame } from '@/components/MarineFrame';
import { api, type ApiError } from '@/lib/api';

type ResultPayload = {
  status: 'CORRECT' | 'WRONG';
  headline: string;
  body: string;
  correctOption: { id: string; text: string } | null;
  timings: {
    timeTakenMs: number | null;
    questionShownAt: string | null;
    answerSubmittedAt: string | null;
  };
};

export default function ResultPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<ResultPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api<ResultPayload>(`/attempts/${params.id}/result`);
        setData(r);
      } catch (err) {
        setError((err as ApiError).message ?? 'Could not load result.');
      }
    })();
  }, [params.id]);

  if (error) {
    return (
      <MarineFrame title="Something went adrift">
        <div className="card text-coral-red">{error}</div>
      </MarineFrame>
    );
  }
  if (!data) {
    return (
      <MarineFrame title="Reading the soundings…">
        <div className="card small">One moment…</div>
      </MarineFrame>
    );
  }

  const correct = data.status === 'CORRECT';
  const seconds = data.timings.timeTakenMs
    ? (data.timings.timeTakenMs / 1000).toFixed(1)
    : null;

  return (
    <MarineFrame>
      <div className="card text-center">
        <div
          className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border-4 ${
            correct ? 'border-foam-green text-foam-green' : 'border-coral-red text-coral-red'
          }`}
        >
          <span className="font-display text-5xl">{correct ? '⚓' : '⛵'}</span>
        </div>

        <h1
          className={`headline mb-3 ${correct ? 'text-foam-green' : 'text-coral-red'}`}
        >
          {data.headline}
        </h1>
        <p className="mx-auto max-w-md text-sail-white/90">{data.body}</p>

        {data.correctOption && (
          <div className="mt-4 rounded bg-blueprint-cyan/10 p-3 text-sm">
            <span className="text-blueprint-cyan">Correct answer:</span>{' '}
            {data.correctOption.text}
          </div>
        )}

        {seconds && (
          <div className="mt-6 font-mono text-xs text-anchor-steel">
            Answered in {seconds}s
          </div>
        )}

        <div className="mt-8">
          <Link href="/" className="btn-secondary">
            Done
          </Link>
        </div>
      </div>
    </MarineFrame>
  );
}
