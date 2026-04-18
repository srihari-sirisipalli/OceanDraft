'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { api, type ApiError } from '@/lib/api';

export default function OtpPage() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpRequestId, setOtpRequestId] = useState<string | null>(null);
  const [mobile, setMobile] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const id = sessionStorage.getItem('od:otpRequestId');
    const mob = sessionStorage.getItem('od:mobile');
    const dev = sessionStorage.getItem('od:devOtp');
    if (!id || !mob) {
      router.replace('/');
      return;
    }
    setOtpRequestId(id);
    setMobile(mob);
    setDevOtp(dev);
    setCooldown(60);
    inputs.current[0]?.focus();
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function onDigit(i: number, v: string) {
    const d = v.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    if (d && i < 5) inputs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  }

  function onPaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = ['', '', '', '', '', ''];
    text.split('').forEach((c, i) => (next[i] = c));
    setDigits(next);
    inputs.current[Math.min(text.length, 5)]?.focus();
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!otpRequestId) return;
    const code = digits.join('');
    if (code.length < 6) return setError('Enter the 6-digit code.');
    setLoading(true);
    setError(null);
    try {
      const r = await api<{ captchaRequired: boolean }>('/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ otpRequestId, code }),
      });
      sessionStorage.removeItem('od:devOtp');
      router.push(r.captchaRequired ? '/captcha' : '/reveal');
    } catch (err) {
      setError((err as ApiError).message ?? 'Invalid code.');
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (!otpRequestId || cooldown > 0) return;
    setError(null);
    try {
      const r = await api<{ otpRequestId: string; devOtp?: string }>(
        '/otp/resend',
        { method: 'POST', body: JSON.stringify({ otpRequestId }) },
      );
      setOtpRequestId(r.otpRequestId);
      sessionStorage.setItem('od:otpRequestId', r.otpRequestId);
      if (r.devOtp) {
        setDevOtp(r.devOtp);
        sessionStorage.setItem('od:devOtp', r.devOtp);
      }
      setCooldown(60);
      setDigits(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } catch (err) {
      setError((err as ApiError).message ?? 'Could not resend.');
    }
  }

  return (
    <Shell>
      <section className="shell-hero flex-col py-16 md:py-24">
        <div className="mx-auto w-full max-w-2xl text-center">
          <span className="eyebrow">Step 2 of 3 · Verification</span>
          <h1 className="display-lg mt-4">Enter your code</h1>
          <p className="lede mx-auto mt-4">
            We sent a 6-digit code to{' '}
            <span className="font-mono text-sail-white">{mobile ?? '…'}</span>.
            It's valid for 5 minutes.
          </p>

          {devOtp && (
            <div className="mx-auto mt-6 max-w-lg rounded-lg border border-brass-gold/40 bg-brass-gold/10 p-3 text-sm text-brass-gold">
              <strong>Dev mode —</strong> your OTP is{' '}
              <span className="ml-2 rounded bg-deep-sea/60 px-2 py-1 font-mono tracking-widest">
                {devOtp}
              </span>
            </div>
          )}

          <form onSubmit={onVerify} onPaste={onPaste} className="panel mt-10 space-y-8">
            <div className="flex justify-center gap-2 md:gap-4">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => onDigit(i, e.target.value)}
                  onKeyDown={(e) => onKeyDown(i, e)}
                  className="h-16 w-12 rounded-xl border-2 border-blueprint-cyan/30 bg-deep-sea/80 text-center font-display text-3xl font-bold text-sail-white focus:border-blueprint-cyan focus:outline-none focus:ring-4 focus:ring-blueprint-cyan/25 md:h-20 md:w-16 md:text-4xl"
                  aria-label={`Digit ${i + 1}`}
                />
              ))}
            </div>

            {error && <div className="alert-error">{error}</div>}

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={onResend}
                disabled={cooldown > 0}
                className="btn-secondary"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
              <button
                type="submit"
                disabled={loading || digits.join('').length < 6}
                className="btn-primary w-full sm:w-auto"
              >
                {loading ? 'Verifying…' : 'Verify & Continue →'}
              </button>
            </div>
          </form>

          <button
            type="button"
            onClick={() => router.replace('/')}
            className="mt-6 text-sm text-anchor-steel hover:text-sail-white"
          >
            ← Change mobile number
          </button>
        </div>
      </section>
    </Shell>
  );
}
