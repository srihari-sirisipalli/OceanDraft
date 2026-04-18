'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { SafeMarkdown } from '@/components/SafeMarkdown';
import { api, type ApiError } from '@/lib/api';

type QuestionPayload = {
  attemptId: string;
  ticketNumber: number | null;
  question: {
    id: string;
    ticketNumber: number | null;
    title: string;
    stem: string;
    type: 'TEXT' | 'IMAGE' | 'MIXED';
    primaryMedia: { id: string; url: string; altText: string } | null;
    options: { id: string; orderIndex: number; text: string }[];
  };
};

export default function QuestionPage() {
  const router = useRouter();
  const [data, setData] = useState<QuestionPayload | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shownAt, setShownAt] = useState<number>(0);
  const [now, setNow] = useState<number>(0);

  const nonce = useMemo(
    () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    [],
  );

  useEffect(() => {
    (async () => {
      try {
        // Prefer the pre-fetched assignment from /reveal to avoid a double call.
        const cached = sessionStorage.getItem('od:assignment');
        let q: QuestionPayload;
        if (cached) {
          q = JSON.parse(cached) as QuestionPayload;
          sessionStorage.removeItem('od:assignment');
        } else {
          q = await api<QuestionPayload>('/assignment/next');
        }
        setData(q);
        setShownAt(Date.now());
        setNow(Date.now());
      } catch (err) {
        const e = err as ApiError;
        if (e.code === 'NO_ACTIVE_QUESTION' || e.code === 'QUESTION_UNAVAILABLE')
          router.replace('/dry-dock');
        else if (e.code === 'ATTEMPT_ALREADY_SUBMITTED' || e.code === 'ATTEMPT_COOLDOWN')
          router.replace('/blocked');
        else if (e.code === 'SESSION_EXPIRED' || e.code === 'SESSION_REQUIRED')
          router.replace('/');
        else if (e.code === 'CAPTCHA_REQUIRED') router.replace('/captcha');
        else setError(e.message ?? 'Could not load question.');
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!shownAt) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [shownAt]);

  async function onSubmit() {
    if (!data || !selectedId) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await api<{ resultId: string }>('/attempts/submit', {
        method: 'POST',
        body: JSON.stringify({
          attemptId: data.attemptId,
          optionId: selectedId,
          clientNonce: nonce,
          clientStartAt: new Date(shownAt).toISOString(),
        }),
      });
      router.push(`/result/${r.resultId}`);
    } catch (err) {
      setError((err as ApiError).message ?? 'Submit failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!data) {
    return (
      <Shell>
        <section className="shell-hero py-24">
          <div className="mx-auto max-w-lg text-center">
            <div className="shimmer mx-auto h-3 w-40 rounded-full" />
            <h1 className="display-lg mt-8">Charting your question…</h1>
            <p className="lede mx-auto mt-4">Plotting a course through the pool.</p>
          </div>
        </section>
      </Shell>
    );
  }

  const seconds = Math.max(0, Math.floor((now - shownAt) / 1000));

  return (
    <Shell>
      <section className="shell-hero flex-col py-12 md:py-16">
        <div className="mx-auto w-full max-w-4xl">
          {/* header with ticket + timer */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="eyebrow">Question</span>
              {data.ticketNumber != null && (
                <span className="rounded-md border border-brass-gold/50 bg-brass-gold/10 px-3 py-1 font-mono text-lg text-brass-gold">
                  #{String(data.ticketNumber).padStart(2, '0')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 rounded-full border border-blueprint-cyan/30 bg-deep-sea/60 px-4 py-1.5 font-mono text-sm text-blueprint-cyan">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blueprint-cyan" />
              {String(Math.floor(seconds / 60)).padStart(2, '0')}:
              {String(seconds % 60).padStart(2, '0')}
            </div>
          </div>

          <div className="panel">
            <h1 className="display-md mb-3 leading-tight">{data.question.title}</h1>

            {data.question.primaryMedia && (
              <figure className="mb-6 overflow-hidden rounded-xl border border-blueprint-cyan/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.question.primaryMedia.url}
                  alt={data.question.primaryMedia.altText}
                  className="h-auto w-full"
                />
                {data.question.primaryMedia.altText && (
                  <figcaption className="bg-deep-sea/60 px-4 py-2 text-xs text-anchor-steel">
                    {data.question.primaryMedia.altText}
                  </figcaption>
                )}
              </figure>
            )}

            <SafeMarkdown
              className="mb-8 text-xl leading-relaxed md:text-2xl"
              source={data.question.stem}
            />

            <div className="space-y-3">
              {data.question.options.map((o, idx) => {
                const selected = selectedId === o.id;
                return (
                  <label
                    key={o.id}
                    className={`option ${selected ? 'option-selected' : ''}`}
                  >
                    <span className="option-dot">
                      {selected && (
                        <span className="h-2.5 w-2.5 rounded-full bg-deep-sea" />
                      )}
                    </span>
                    <span className="font-mono text-sm text-blueprint-cyan">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <SafeMarkdown className="flex-1" source={o.text} />
                    <input
                      type="radio"
                      name="option"
                      value={o.id}
                      checked={selected}
                      onChange={() => setSelectedId(o.id)}
                      className="sr-only"
                    />
                  </label>
                );
              })}
            </div>

            {error && <div className="alert-error mt-6">{error}</div>}

            <div className="mt-8 flex justify-end">
              <button
                onClick={onSubmit}
                disabled={!selectedId || submitting}
                className="btn-primary text-lg"
              >
                {submitting ? 'Submitting…' : 'Submit Answer →'}
              </button>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-anchor-steel">
            One attempt · One answer · Result shown immediately
          </p>
        </div>
      </section>
    </Shell>
  );
}
