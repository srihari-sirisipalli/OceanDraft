'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MarineFrame } from '@/components/MarineFrame';
import { api, type ApiError } from '@/lib/api';

export default function LandingPage() {
  const router = useRouter();
  const [country, setCountry] = useState('+91');
  const [mobile, setMobile] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!consent) {
      setError('Please accept the consent to continue.');
      return;
    }
    if (!/^\d{6,14}$/.test(mobile)) {
      setError('Enter a valid mobile number (digits only).');
      return;
    }
    setLoading(true);
    try {
      const full = `${country}${mobile}`;
      const cand = await api<{ candidateId: string; mobileE164: string }>(
        '/candidates/init',
        {
          method: 'POST',
          body: JSON.stringify({ mobile: full, countryCode: 'IN', consent: true }),
        },
      );
      const otp = await api<{ otpRequestId: string; expiresAt: string; devOtp?: string }>(
        '/otp/send',
        { method: 'POST', body: JSON.stringify({ candidateId: cand.candidateId }) },
      );
      sessionStorage.setItem('od:otpRequestId', otp.otpRequestId);
      sessionStorage.setItem('od:mobile', cand.mobileE164);
      if (otp.devOtp) sessionStorage.setItem('od:devOtp', otp.devOtp);
      router.push('/otp');
    } catch (err) {
      setError((err as ApiError).message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <MarineFrame
      title="Navigate the one question."
      subtitle="Verify your mobile, weigh anchor, and answer a single marine & naval architecture question. We'll chart your result in seconds."
    >
      <form onSubmit={onSubmit} className="card space-y-5">
        <div className="flex gap-2">
          <div className="w-24">
            <label className="label" htmlFor="country">
              Code
            </label>
            <select
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="input"
            >
              <option value="+91">+91</option>
              <option value="+1">+1</option>
              <option value="+44">+44</option>
              <option value="+971">+971</option>
              <option value="+65">+65</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="label" htmlFor="mobile">
              Mobile number
            </label>
            <input
              id="mobile"
              inputMode="numeric"
              pattern="\d*"
              placeholder="e.g. 9876543210"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
              className="input"
              required
            />
          </div>
        </div>

        <label className="flex items-start gap-3 text-sm text-anchor-steel">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-blueprint-cyan/50 bg-deep-sea text-blueprint-cyan"
          />
          <span>
            I consent to receive an SMS verification code and to the processing of my mobile
            number per the{' '}
            <a href="#" className="text-blueprint-cyan underline">
              privacy notice
            </a>
            .
          </span>
        </label>

        {error && <div className="rounded bg-coral-red/20 p-3 text-sm text-coral-red">{error}</div>}

        <div className="flex items-center justify-between">
          <Link href="/admin/login" className="small underline">
            Admin login →
          </Link>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Sending…' : 'Send OTP'}
          </button>
        </div>
      </form>
    </MarineFrame>
  );
}
