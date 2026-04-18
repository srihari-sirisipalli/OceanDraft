'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { api, type ApiError } from '@/lib/api';

export default function CaptchaPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState<string>('Loading…');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      const r = await api<{ challengeId: string; prompt: string }>('/captcha/new');
      setChallengeId(r.challengeId);
      setPrompt(r.prompt);
    } catch (err) {
      setError((err as ApiError).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!challengeId) return;
    setLoading(true);
    setError(null);
    try {
      await api('/captcha/verify', {
        method: 'POST',
        body: JSON.stringify({ challengeId, answer }),
      });
      router.push('/start');
    } catch (err) {
      setError((err as ApiError).message);
      load();
      setAnswer('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <section className="shell-hero py-16 md:py-28">
        <div className="mx-auto w-full max-w-xl text-center">
          <span className="eyebrow">Human verification</span>
          <h1 className="display-lg mt-4">Quick check before boarding</h1>
          <p className="lede mx-auto mt-4">
            Solve this to confirm you're a human — not a rogue bot scraping the
            harbour.
          </p>
          <form onSubmit={onSubmit} className="panel mt-10 space-y-6">
            <div className="rounded-xl border border-blueprint-cyan/20 bg-deep-sea/60 p-8">
              <div className="eyebrow mb-2">Challenge</div>
              <div className="display-md">{prompt}</div>
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="input-xl text-center"
              required
              placeholder="Your answer"
            />
            {error && <div className="alert-error">{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Checking…' : 'Continue →'}
            </button>
          </form>
        </div>
      </section>
    </Shell>
  );
}
