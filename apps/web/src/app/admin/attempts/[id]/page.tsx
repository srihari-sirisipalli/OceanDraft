'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type ApiError } from '@/lib/api';

type AttemptDetail = {
  id: string;
  status: string;
  isCorrect: boolean | null;
  timeTakenMs: number | null;
  questionShownAt: string | null;
  answerSubmittedAt: string | null;
  candidate: { mobileE164: string; firstSeenAt: string };
  question: {
    id: string;
    title: string;
    stemMarkdown: string;
    category: { name: string };
    options: { id: string; textMarkdown: string; isCorrect: boolean; orderIndex: number }[];
  };
  selectedOption: { id: string; textMarkdown: string } | null;
  ip: string | null;
  ua: string | null;
};

export default function AdminAttemptDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<AttemptDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api<AttemptDetail>(`/admin/attempts/${params.id}`);
        setData(r);
      } catch (e) {
        setErr((e as ApiError).message);
      }
    })();
  }, [params.id]);

  if (err) return <div className="alert-error">{err}</div>;
  if (!data) return <div className="alert-info">Loading…</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Attempt detail</span>
          <h1 className="display-lg mt-2">{data.question.title}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={data.isCorrect ? 'pill-green' : 'pill-red'}>
              {data.isCorrect ? 'CORRECT' : 'WRONG'}
            </span>
            <span className="pill-cyan">{data.question.category.name}</span>
            <span className="pill-gold">
              {data.timeTakenMs ? `${(data.timeTakenMs / 1000).toFixed(1)}s` : '—'}
            </span>
          </div>
        </div>
        <Link href="/admin/attempts" className="btn-ghost">
          ← Back
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="panel space-y-4 md:col-span-2">
          <h2 className="display-md">Question snapshot</h2>
          <p className="whitespace-pre-wrap text-lg">{data.question.stemMarkdown}</p>
          <ul className="space-y-2">
            {data.question.options
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((o) => {
                const chosen = data.selectedOption?.id === o.id;
                const cls = o.isCorrect
                  ? 'border-foam-green/60 bg-foam-green/5'
                  : chosen
                    ? 'border-coral-red/60 bg-coral-red/5'
                    : 'border-blueprint-cyan/15 bg-deep-sea/40';
                return (
                  <li
                    key={o.id}
                    className={`flex items-start gap-3 rounded-xl border-2 p-3 ${cls}`}
                  >
                    <span className="font-mono text-blueprint-cyan">
                      {String.fromCharCode(65 + o.orderIndex)}
                    </span>
                    <span className="flex-1">{o.textMarkdown}</span>
                    {o.isCorrect && <span className="pill-green">Correct</span>}
                    {chosen && !o.isCorrect && (
                      <span className="pill-red">Chosen</span>
                    )}
                    {chosen && o.isCorrect && <span className="pill-green">Chosen</span>}
                  </li>
                );
              })}
          </ul>
        </div>

        <div className="panel space-y-4">
          <h2 className="display-md">Metadata</h2>
          <KV k="Candidate (masked)" v={data.candidate.mobileE164} mono />
          <KV
            k="First seen"
            v={new Date(data.candidate.firstSeenAt).toLocaleString()}
          />
          <KV
            k="Question shown"
            v={
              data.questionShownAt
                ? new Date(data.questionShownAt).toLocaleString()
                : '—'
            }
          />
          <KV
            k="Submitted"
            v={
              data.answerSubmittedAt
                ? new Date(data.answerSubmittedAt).toLocaleString()
                : '—'
            }
          />
          <KV
            k="Time taken"
            v={data.timeTakenMs ? `${(data.timeTakenMs / 1000).toFixed(1)}s` : '—'}
          />
          <KV k="IP" v={data.ip ?? '—'} mono />
          <KV k="Status" v={data.status} />
        </div>
      </div>
    </div>
  );
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div>
      <div className="eyebrow">{k}</div>
      <div className={`mt-1 text-sm ${mono ? 'font-mono' : ''}`}>{v}</div>
    </div>
  );
}
