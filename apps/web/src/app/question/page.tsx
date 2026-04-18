'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MarineFrame } from '@/components/MarineFrame';
import { api, type ApiError } from '@/lib/api';

type QuestionPayload = {
  attemptId: string;
  question: {
    id: string;
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

  const nonce = useMemo(
    () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    [],
  );

  useEffect(() => {
    (async () => {
      try {
        const q = await api<QuestionPayload>('/assignment/next');
        setData(q);
        setShownAt(Date.now());
      } catch (err) {
        const e = err as ApiError;
        if (e.code === 'NO_ACTIVE_QUESTION' || e.code === 'QUESTION_UNAVAILABLE') {
          router.replace('/dry-dock');
        } else if (e.code === 'ATTEMPT_ALREADY_SUBMITTED' || e.code === 'ATTEMPT_COOLDOWN') {
          router.replace('/blocked');
        } else if (e.code === 'SESSION_EXPIRED' || e.code === 'SESSION_REQUIRED') {
          router.replace('/');
        } else if (e.code === 'CAPTCHA_REQUIRED') {
          router.replace('/captcha');
        } else {
          setError(e.message ?? 'Could not load question.');
        }
      }
    })();
  }, [router]);

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
      <MarineFrame title="Charting your question…">
        <div className="card small">Please hold — plotting a course.</div>
      </MarineFrame>
    );
  }

  return (
    <MarineFrame title={data.question.title} subtitle="One question. One answer.">
      <div className="card space-y-5">
        {data.question.primaryMedia && (
          <figure className="overflow-hidden rounded-lg border border-blueprint-cyan/20">
            <img
              src={data.question.primaryMedia.url}
              alt={data.question.primaryMedia.altText}
              className="h-auto w-full"
            />
          </figure>
        )}
        <p className="whitespace-pre-wrap text-lg leading-relaxed">{data.question.stem}</p>
        <div className="space-y-3">
          {data.question.options.map((o) => (
            <label
              key={o.id}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                selectedId === o.id
                  ? 'border-blueprint-cyan bg-blueprint-cyan/10'
                  : 'border-blueprint-cyan/20 hover:border-blueprint-cyan/50'
              }`}
            >
              <input
                type="radio"
                name="option"
                value={o.id}
                checked={selectedId === o.id}
                onChange={() => setSelectedId(o.id)}
                className="mt-1 h-4 w-4"
              />
              <span className="flex-1">{o.text}</span>
            </label>
          ))}
        </div>

        {error && (
          <div className="rounded bg-coral-red/20 p-3 text-sm text-coral-red">{error}</div>
        )}

        <button
          onClick={onSubmit}
          disabled={!selectedId || submitting}
          className="btn-primary w-full"
        >
          {submitting ? 'Submitting…' : 'Submit Answer'}
        </button>
      </div>
    </MarineFrame>
  );
}
