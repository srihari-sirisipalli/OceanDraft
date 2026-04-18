'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { api, type ApiError } from '@/lib/api';

type Assignment = {
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

export default function RevealPage() {
  const router = useRouter();
  const [data, setData] = useState<Assignment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const a = await api<Assignment>('/assignment/next');
        sessionStorage.setItem('od:assignment', JSON.stringify(a));
        setData(a);
        // shuffle reveal — count up briefly to build tension
        const target = a.ticketNumber ?? 0;
        let n = 0;
        const id = setInterval(() => {
          n += 1;
          if (n > 40) {
            clearInterval(id);
            setShown(target);
          } else {
            setShown(Math.floor(Math.random() * 99) + 1);
          }
        }, 40);
      } catch (err) {
        const e = err as ApiError;
        if (e.code === 'NO_ACTIVE_QUESTION' || e.code === 'QUESTION_UNAVAILABLE') {
          router.replace('/dry-dock');
        } else if (
          e.code === 'ATTEMPT_ALREADY_SUBMITTED' ||
          e.code === 'ATTEMPT_COOLDOWN'
        ) {
          router.replace('/blocked');
        } else if (e.code === 'CAPTCHA_REQUIRED') {
          router.replace('/captcha');
        } else if (e.code === 'SESSION_EXPIRED' || e.code === 'SESSION_REQUIRED') {
          router.replace('/');
        } else {
          setError(e.message ?? 'Could not draw your ticket.');
        }
      }
    })();
  }, [router]);

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

  const ticket = shown ?? 0;
  const ready = data && shown === data.ticketNumber;

  return (
    <Shell>
      <section className="shell-hero flex-col py-16 md:py-24">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
          <span className="eyebrow mb-6">Your ticket</span>
          <p className="lede mb-10">
            Every visitor draws a unique question from the bank. This is yours —
            it won't be shown again today.
          </p>

          <div
            className={`relative mb-10 flex h-60 w-60 items-center justify-center rounded-full transition-all duration-500 md:h-72 md:w-72 ${
              ready
                ? 'bg-gradient-to-br from-brass-gold to-blueprint-cyan shadow-porthole'
                : 'bg-gradient-to-br from-hull-navy to-deep-sea'
            }`}
            style={
              ready
                ? {
                    boxShadow:
                      '0 0 0 14px rgba(197,157,95,0.14), 0 40px 80px -20px rgba(197,157,95,0.35)',
                  }
                : undefined
            }
          >
            <div className="flex h-52 w-52 items-center justify-center rounded-full border-4 border-deep-sea bg-deep-sea/80 backdrop-blur md:h-64 md:w-64">
              <div>
                <div className="eyebrow">Question</div>
                <div className="font-display text-7xl font-bold text-brass-gold md:text-8xl">
                  #{String(ticket).padStart(2, '0')}
                </div>
              </div>
            </div>
          </div>

          {ready ? (
            <>
              <p className="lede mb-8">
                Ready when you are, captain. Tap to reveal the question.
              </p>
              <button
                onClick={() => router.push('/question')}
                className="btn-primary px-12 py-5 text-xl"
              >
                Reveal question ⚓
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-anchor-steel">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blueprint-cyan" />
              <span className="font-mono text-sm uppercase tracking-[0.3em]">
                Drawing…
              </span>
            </div>
          )}
        </div>
      </section>
    </Shell>
  );
}
