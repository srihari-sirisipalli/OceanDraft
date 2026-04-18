'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MarineFrame } from '@/components/MarineFrame';
import { api, type ApiError } from '@/lib/api';

export default function OtpPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
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
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!otpRequestId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await api<{ captchaRequired: boolean }>('/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ otpRequestId, code }),
      });
      sessionStorage.removeItem('od:devOtp');
      router.push(r.captchaRequired ? '/captcha' : '/start');
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
    } catch (err) {
      setError((err as ApiError).message ?? 'Could not resend.');
    }
  }

  return (
    <MarineFrame
      title="Enter your code"
      subtitle={`We sent a code to ${mobile ?? 'your mobile'}. It's valid for 5 minutes.`}
    >
      <form onSubmit={onVerify} className="card space-y-5">
        {devOtp && (
          <div className="rounded bg-brass-gold/20 p-3 text-sm text-brass-gold">
            <strong>Dev mode:</strong> your OTP is <code className="font-mono">{devOtp}</code>
          </div>
        )}
        <div>
          <label className="label" htmlFor="code">
            Verification code
          </label>
          <input
            id="code"
            inputMode="numeric"
            pattern="\d*"
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="input text-center text-2xl tracking-[0.5em]"
            placeholder="——————"
            required
          />
        </div>

        {error && (
          <div className="rounded bg-coral-red/20 p-3 text-sm text-coral-red">{error}</div>
        )}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onResend}
            disabled={cooldown > 0}
            className="btn-secondary"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
          <button type="submit" disabled={loading || code.length < 4} className="btn-primary">
            {loading ? 'Verifying…' : 'Verify'}
          </button>
        </div>
      </form>
    </MarineFrame>
  );
}
