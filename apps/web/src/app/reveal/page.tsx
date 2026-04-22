'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { api, type ApiError } from '@/lib/api';
import { playReveal, playSeagull, playSonarPing } from '@/lib/sound';

type Category = { slug: string; name: string };

type Assignment = {
  attemptId: string;
  ticketNumber: number | null;
  displayTicketNumber: number | null;
  category: Category | null;
  question: {
    id: string;
    ticketNumber: number | null;
    displayTicketNumber: number | null;
    title: string;
    stem: string;
    type: 'TEXT' | 'IMAGE' | 'MIXED';
    primaryMedia: { id: string; url: string; altText: string } | null;
    options: { id: string; orderIndex: number; text: string }[];
    category?: Category | null;
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
        playReveal();
        // 30% chance of a single gull cry as the visitor lands.
        if (Math.random() < 0.3) {
          setTimeout(() => playSeagull(), 1400);
        }
        // shuffle reveal — count up briefly to build tension
        const target = a.displayTicketNumber ?? a.ticketNumber ?? 0;
        let n = 0;
        const id = setInterval(() => {
          n += 1;
          if (n > 40) {
            clearInterval(id);
            setShown(target);
            // Sonar ping when the number locks in.
            playSonarPing();
          } else {
            // Random 4-digit number in the same range as the target for visual continuity.
            setShown(500 + Math.floor(Math.random() * 1500));
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
  const target = data?.displayTicketNumber ?? data?.ticketNumber ?? null;
  const ready = data && shown === target;

  return (
    <Shell
      scene="reveal"
      sceneCtx={{ categorySlug: data?.category?.slug ?? null }}
    >
      <section className="shell-hero flex-col py-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center text-center">
          <span
            className="eyebrow mb-4"
            style={{ fontSize: 'clamp(0.9rem, 1.1vw, 1.1rem)' }}
          >
            Your ticket
          </span>
          <p
            className="lede mb-6 max-w-3xl"
            style={{ fontSize: 'clamp(1.1rem, 1.6vw, 1.6rem)' }}
          >
            Every visitor draws a unique question from the bank. This is yours —
            it won't be shown again today.
          </p>

          <div
            className={`relative mb-8 flex items-center justify-center rounded-full transition-all duration-500 ${
              ready
                ? 'bg-gradient-to-br from-brass-gold to-blueprint-cyan shadow-porthole'
                : 'bg-gradient-to-br from-hull-navy to-deep-sea'
            }`}
            style={{
              width: 'min(52vh, 34rem)',
              height: 'min(52vh, 34rem)',
              boxShadow: ready
                ? '0 0 0 18px rgba(197,157,95,0.14), 0 40px 80px -20px rgba(197,157,95,0.4)'
                : undefined,
            }}
          >
            <div
              className="flex items-center justify-center rounded-full border-[6px] border-deep-sea bg-deep-sea/80 backdrop-blur"
              style={{
                width: 'min(42vh, 27rem)',
                height: 'min(42vh, 27rem)',
              }}
            >
              <div>
                <div
                  className="eyebrow"
                  style={{ fontSize: 'clamp(0.9rem, 1.2vw, 1.2rem)' }}
                >
                  Question
                </div>
                <div
                  className="font-display font-bold text-brass-gold"
                  style={{
                    fontSize: 'clamp(4rem, 10vw, 10rem)',
                    lineHeight: '1',
                  }}
                >
                  #{String(ticket).padStart(4, '0')}
                </div>
              </div>
            </div>
          </div>

          {ready ? (
            <>
              <p
                className="lede mb-6"
                style={{ fontSize: 'clamp(1.1rem, 1.6vw, 1.6rem)' }}
              >
                Ready when you are, captain. Tap to reveal the question.
              </p>
              <button
                onClick={() => router.push('/question')}
                className="btn-primary"
                style={{
                  padding: '1.25rem 3.5rem',
                  fontSize: 'clamp(1.25rem, 2vw, 1.75rem)',
                }}
              >
                Reveal question ⚓
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3 text-anchor-steel">
              <span className="h-3 w-3 animate-pulse rounded-full bg-blueprint-cyan" />
              <span className="font-mono text-base uppercase tracking-[0.3em]">
                Drawing…
              </span>
            </div>
          )}
        </div>
      </section>
    </Shell>
  );
}
