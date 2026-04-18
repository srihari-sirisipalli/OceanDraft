'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { api, type ApiError } from '@/lib/api';
import { usePublicSettings } from '@/lib/public-settings';

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
  const router = useRouter();
  const [data, setData] = useState<ResultPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const settings = usePublicSettings();

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

  // Kiosk auto-reset countdown
  const kiosk = !!settings?.event.kioskMode;
  const autoSecs = settings?.event.autoResetSeconds ?? 10;
  const [remaining, setRemaining] = useState(autoSecs);
  useEffect(() => {
    if (!kiosk || !data) return;
    setRemaining(autoSecs);
    const t = setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [kiosk, autoSecs, data]);

  useEffect(() => {
    if (!kiosk || remaining > 0) return;
    router.replace('/');
  }, [kiosk, remaining, router]);

  if (error) {
    return (
      <Shell>
        <section className="shell-hero py-24">
          <div className="mx-auto max-w-lg text-center">
            <h1 className="display-lg">Something went adrift</h1>
            <p className="alert-error mt-6 text-left">{error}</p>
          </div>
        </section>
      </Shell>
    );
  }
  if (!data) {
    return (
      <Shell>
        <section className="shell-hero py-24">
          <div className="mx-auto max-w-lg text-center">
            <div className="shimmer mx-auto h-3 w-40 rounded-full" />
            <h1 className="display-lg mt-8">Reading the soundings…</h1>
          </div>
        </section>
      </Shell>
    );
  }

  const correct = data.status === 'CORRECT';
  const seconds = data.timings.timeTakenMs
    ? (data.timings.timeTakenMs / 1000).toFixed(1)
    : null;

  return (
    <Shell>
      <section className="shell-hero py-16 md:py-24">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
          <div
            className={`relative mb-10 flex h-40 w-40 items-center justify-center rounded-full md:h-56 md:w-56 ${
              correct
                ? 'bg-gradient-to-br from-foam-green to-brass-gold pulse-success'
                : 'bg-gradient-to-br from-coral-red to-hull-navy pulse-fail'
            }`}
            style={{
              boxShadow: correct
                ? '0 0 0 12px rgba(61,178,125,0.12), 0 40px 80px -20px rgba(61,178,125,0.4)'
                : '0 0 0 12px rgba(217,83,79,0.12), 0 40px 80px -20px rgba(217,83,79,0.4)',
            }}
          >
            <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-deep-sea bg-deep-sea/80 backdrop-blur md:h-44 md:w-44">
              <span className="text-6xl md:text-8xl">{correct ? '⚓' : '⛵'}</span>
            </div>
          </div>

          <span className="eyebrow">{correct ? 'Correct' : 'Not quite'}</span>
          <h1
            className={`display-xl mt-4 ${
              correct ? 'text-foam-green' : 'text-coral-red'
            }`}
          >
            {correct ? 'Hooray!' : 'Rough seas'}
          </h1>
          <p className="lede mx-auto mt-4 text-xl">{data.headline}</p>
          <p className="mx-auto mt-4 max-w-xl text-base text-sail-white/80">
            {data.body}
          </p>

          {data.correctOption && (
            <div className="alert-info mt-8 w-full max-w-xl text-left">
              <div className="eyebrow mb-1 text-blueprint-cyan">Correct answer</div>
              <div className="text-lg text-sail-white">{data.correctOption.text}</div>
            </div>
          )}

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-anchor-steel">
            {seconds && <Stat label="Time taken" value={`${seconds}s`} />}
            <Stat label="Result" value={correct ? 'Pass' : 'Fail'} />
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-4">
            {kiosk ? (
              <Link href="/" className="btn-primary text-lg">
                Next visitor → ({remaining}s)
              </Link>
            ) : (
              <Link href="/" className="btn-secondary">
                Return to shore
              </Link>
            )}
          </div>
          {kiosk && (
            <p className="mt-6 text-xs text-anchor-steel">
              Auto-reset in {remaining}s · tap anywhere on the button for the next visitor
            </p>
          )}
        </div>
      </section>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="eyebrow">{label}</span>
      <span className="mt-1 font-display text-xl text-sail-white">{value}</span>
    </div>
  );
}
