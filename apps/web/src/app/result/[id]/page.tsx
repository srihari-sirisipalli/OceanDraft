'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Shell } from '@/components/Shell';
import { api, type ApiError } from '@/lib/api';
import { usePublicSettings } from '@/lib/public-settings';
import {
  playCorrect,
  playSeagull,
  playSplash,
  playTimeout,
  playWrong,
} from '@/lib/sound';

type ResultPayload = {
  status: 'CORRECT' | 'WRONG' | 'EXPIRED';
  headline: string;
  body: string;
  ticketNumber: number | null;
  displayTicketNumber: number | null;
  category: { slug: string; name: string } | null;
  timeLimitSeconds: number | null;
  correctOption: { id: string; text: string } | null;
  timings: {
    timeTakenMs: number | null;
    questionShownAt: string | null;
    answerSubmittedAt: string | null;
  };
};

export default function ResultPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const search = useSearchParams();
  const [data, setData] = useState<ResultPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const settings = usePublicSettings();
  const reducedMotion = useReducedMotion();
  const animationsOn =
    (settings?.branding.animationsEnabled ?? true) && !reducedMotion;
  const expiredHint = search?.get('expired') === '1';

  // Load the result. If the attempt is still IN_PROGRESS, expire it first so
  // the backend can assign an EXPIRE_ template before we re-fetch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tryFetch = async () =>
        api<ResultPayload>(`/attempts/${params.id}/result`);
      try {
        const r = await tryFetch();
        if (!cancelled) setData(r);
      } catch (err) {
        const e = err as ApiError;
        if (expiredHint && e.code === 'ATTEMPT_NOT_SUBMITTED') {
          try {
            await api('/attempts/expire', {
              method: 'POST',
              body: JSON.stringify({ attemptId: params.id }),
            });
            const r = await tryFetch();
            if (!cancelled) setData(r);
            return;
          } catch (e2) {
            if (!cancelled)
              setError((e2 as ApiError).message ?? 'Could not load result.');
            return;
          }
        }
        if (!cancelled) setError(e.message ?? 'Could not load result.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id, expiredHint]);

  // Play sound + confetti exactly once when the result arrives.
  const celebrated = useRef(false);
  useEffect(() => {
    if (!data || celebrated.current) return;
    celebrated.current = true;
    const soundOn = settings?.branding.soundEnabled ?? true;
    if (data.status === 'CORRECT') {
      if (soundOn) {
        playCorrect();
        // Seagull flock woven through the fanfare and chord.
        setTimeout(() => playSeagull(), 650);
        setTimeout(() => playSeagull(), 1200);
        setTimeout(() => playSeagull(), 2100);
        setTimeout(() => playSeagull(), 2900);
      }
      if (animationsOn) fireConfetti();
    } else if (data.status === 'EXPIRED') {
      if (soundOn) {
        playTimeout();
        // A watery splash after the foghorn — sinking ship.
        setTimeout(() => playSplash(), 800);
      }
    } else {
      if (soundOn) {
        playWrong();
        // Small splash as the listing ship takes water.
        setTimeout(() => playSplash(), 350);
      }
    }
  }, [data, animationsOn, settings]);

  // Safety auto-reset: after N seconds of inactivity, bounce back to landing.
  const fallbackSecs = settings?.result.autoResetFallbackSeconds ?? 120;
  const fallbackOn = settings?.result.autoResetFallbackEnabled ?? true;
  const [remaining, setRemaining] = useState(fallbackSecs);
  const [cancelled, setCancelled] = useState(false);
  useEffect(() => {
    if (!fallbackOn || cancelled || !data) return;
    setRemaining(fallbackSecs);
    const resetTimer = () => setRemaining(fallbackSecs);
    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'pointermove',
      'scroll',
    ];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    const id = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => {
      clearInterval(id);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [fallbackOn, cancelled, data, fallbackSecs]);
  useEffect(() => {
    if (fallbackOn && !cancelled && data && remaining === 0) {
      router.replace('/');
    }
  }, [fallbackOn, cancelled, data, remaining, router]);

  if (error) {
    return (
      <Shell>
        <section className="shell-hero py-24">
          <div className="mx-auto max-w-lg text-center">
            <h1 className="display-lg">Something went adrift</h1>
            <p className="alert-error mt-6 text-left">{error}</p>
            <Link href="/" className="btn-secondary mt-8">
              Return to shore
            </Link>
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
  const expired = data.status === 'EXPIRED';
  const seconds = data.timings.timeTakenMs
    ? (data.timings.timeTakenMs / 1000).toFixed(1)
    : null;
  const scene = expired
    ? 'timeout'
    : correct
      ? 'result-correct'
      : 'result-wrong';
  const label = expired ? "Time's up" : correct ? 'Correct' : 'Not quite';
  const titleClass = expired
    ? 'text-brass-gold'
    : correct
      ? 'text-foam-green'
      : 'text-coral-red';
  const emoji = expired ? '⏳' : correct ? '⚓' : '⛵';
  const gradient = expired
    ? 'bg-gradient-to-br from-brass-gold to-hull-navy'
    : correct
      ? 'bg-gradient-to-br from-foam-green to-brass-gold pulse-success'
      : 'bg-gradient-to-br from-coral-red to-hull-navy pulse-fail';
  const shadow = expired
    ? '0 0 0 12px rgba(197,157,95,0.12), 0 40px 80px -20px rgba(197,157,95,0.4)'
    : correct
      ? '0 0 0 12px rgba(61,178,125,0.12), 0 40px 80px -20px rgba(61,178,125,0.4)'
      : '0 0 0 12px rgba(217,83,79,0.12), 0 40px 80px -20px rgba(217,83,79,0.4)';

  // Big leaping bounce for CORRECT (repeating), shake for WRONG, slow sway for EXPIRED.
  const iconAnim = animationsOn
    ? correct
      ? {
          y: [0, -40, 0, -26, 0, -14, 0],
          scale: [1, 1.18, 1, 1.1, 1, 1.05, 1],
          rotate: [0, -4, 0, 3, 0, -2, 0],
        }
      : expired
        ? { rotate: [-3, 3, -3] }
        : { x: [0, -14, 14, -10, 10, 0] }
    : undefined;
  const iconTrans = correct
    ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' as const }
    : expired
      ? { duration: 3, repeat: Infinity, ease: 'easeInOut' as const }
      : { duration: 0.55 };

  const showPill = fallbackOn && !cancelled && remaining <= 30 && remaining > 0;

  return (
    <Shell
      scene={scene}
      sceneCtx={{
        categorySlug: data.category?.slug ?? null,
        timeTakenMs: data.timings.timeTakenMs ?? null,
        timeLimitSeconds: data.timeLimitSeconds ?? null,
      }}
    >
      <section className="shell-hero flex-col py-8 md:py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center text-center">
          {data.displayTicketNumber != null && (
            <span className="mb-6 rounded-md border border-brass-gold/40 bg-brass-gold/10 px-4 py-1.5 font-mono text-base text-brass-gold">
              Ticket #{String(data.displayTicketNumber).padStart(4, '0')}
            </span>
          )}

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={animationsOn ? { scale: 1, opacity: 1 } : { opacity: 1 }}
            transition={{ duration: 0.5, ease: 'backOut' }}
            className="relative mb-8"
          >
            <motion.div
              animate={iconAnim}
              transition={iconTrans}
              className={`flex h-[22rem] w-[22rem] items-center justify-center rounded-full ${gradient}`}
              style={{ boxShadow: shadow }}
            >
              <div className="flex h-[17rem] w-[17rem] items-center justify-center rounded-full border-[6px] border-deep-sea bg-deep-sea/80 backdrop-blur">
                <span className="text-[11rem] leading-none">{emoji}</span>
              </div>
            </motion.div>
          </motion.div>

          <span className="eyebrow text-base">{label}</span>
          <h1
            className={`display-xl mt-3 ${titleClass}`}
            style={{ fontSize: 'clamp(3rem, 8vw, 7rem)' }}
          >
            {expired ? "Time's up" : correct ? 'Hooray!' : 'Rough seas'}
          </h1>
          <p className="lede mx-auto mt-4 max-w-3xl text-2xl md:text-3xl">
            {data.headline}
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-sail-white/80">
            {data.body}
          </p>

          {data.correctOption && (
            <div className="alert-info mt-8 w-full max-w-2xl text-left">
              <div className="eyebrow mb-1 text-blueprint-cyan">Correct answer</div>
              <div className="text-xl text-sail-white">{data.correctOption.text}</div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-10 text-sm text-anchor-steel">
            {seconds && <Stat label="Time taken" value={`${seconds}s`} />}
            <Stat
              label="Result"
              value={expired ? 'Expired' : correct ? 'Pass' : 'Fail'}
            />
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/"
              className="btn-primary px-12 py-5 text-2xl"
            >
              Return to shore ⚓
            </Link>
          </div>
        </div>
      </section>

      {showPill && (
        <div className="pointer-events-auto fixed bottom-6 left-1/2 z-30 -translate-x-1/2 text-center">
          <button
            type="button"
            onClick={() => setCancelled(true)}
            className="rounded-full border border-brass-gold/40 bg-deep-sea/90 px-5 py-2 font-mono text-sm text-brass-gold shadow-lg backdrop-blur transition hover:border-brass-gold"
          >
            Resetting in {remaining}s · tap to cancel
          </button>
        </div>
      )}
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="eyebrow">{label}</span>
      <span className="mt-1 font-display text-3xl text-sail-white">{value}</span>
    </div>
  );
}

function fireConfetti() {
  // ~5-second firework show, rainbow + brass/ocean palette.
  const palette = [
    '#C59D5F', '#3DB27D', '#2FB6C6', '#F4EADC', '#F4B061',
    '#D04747', '#7DC8E8', '#E8B4DC', '#FFD54F',
  ];
  const base = { ticks: 220, scalar: 1.05, colors: palette };

  // Opening — twin edge cannons.
  confetti({ ...base, particleCount: 120, spread: 70, startVelocity: 65, angle: 55, origin: { x: 0, y: 0.9 } });
  confetti({ ...base, particleCount: 120, spread: 70, startVelocity: 65, angle: 125, origin: { x: 1, y: 0.9 } });

  // Center burst.
  setTimeout(() => {
    confetti({ ...base, particleCount: 160, spread: 140, startVelocity: 55, angle: 90, origin: { x: 0.5, y: 0.55 } });
  }, 300);

  // Firework bursts at random positions across 4s.
  const bursts = [
    { t: 700, x: 0.25, y: 0.4 },
    { t: 1100, x: 0.75, y: 0.4 },
    { t: 1500, x: 0.5, y: 0.3 },
    { t: 1900, x: 0.2, y: 0.35 },
    { t: 2300, x: 0.8, y: 0.35 },
    { t: 2700, x: 0.35, y: 0.45 },
    { t: 3100, x: 0.65, y: 0.45 },
    { t: 3500, x: 0.5, y: 0.25 },
  ];
  for (const b of bursts) {
    setTimeout(() => {
      confetti({
        ...base,
        particleCount: 80,
        spread: 360,
        startVelocity: 35,
        gravity: 0.9,
        decay: 0.93,
        origin: { x: b.x, y: b.y },
        shapes: ['circle', 'square'],
      });
    }, b.t);
  }

  // Grand finale — all-sides cannons.
  setTimeout(() => {
    confetti({ ...base, particleCount: 160, spread: 80, startVelocity: 70, angle: 60, origin: { x: 0, y: 0.95 } });
    confetti({ ...base, particleCount: 160, spread: 80, startVelocity: 70, angle: 120, origin: { x: 1, y: 0.95 } });
    confetti({ ...base, particleCount: 140, spread: 180, startVelocity: 50, angle: 90, origin: { x: 0.5, y: 0.6 } });
  }, 4000);

  // Gentle falling shower at the very end.
  setTimeout(() => {
    confetti({ ...base, particleCount: 200, spread: 360, startVelocity: 18, gravity: 0.6, decay: 0.95, scalar: 0.9, origin: { x: 0.5, y: 0.1 } });
  }, 4600);
}
