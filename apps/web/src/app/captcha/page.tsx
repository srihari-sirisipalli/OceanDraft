'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MarineFrame } from '@/components/MarineFrame';
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
    <MarineFrame
      title="Quick check"
      subtitle="A brief challenge to make sure you're human before we lower the gangway."
    >
      <form onSubmit={onSubmit} className="card space-y-5">
        <div className="text-center">
          <div className="font-display text-2xl">{prompt}</div>
        </div>
        <input
          type="text"
          inputMode="numeric"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="input text-center"
          required
          placeholder="Your answer"
        />
        {error && <div className="rounded bg-coral-red/20 p-3 text-sm text-coral-red">{error}</div>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Checking…' : 'Continue'}
        </button>
      </form>
    </MarineFrame>
  );
}
