'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { CompassMark } from '@/components/CompassMark';
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
    if (!consent) return setError('Please accept the consent to continue.');
    if (!/^\d{6,14}$/.test(mobile))
      return setError('Enter a valid mobile number (digits only).');

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
    <Shell
      topRight={
        <Link href="/admin/login" className="btn-ghost text-sm">
          Admin Bridge →
        </Link>
      }
    >
      <section className="shell-hero grid grid-cols-1 gap-14 py-14 md:grid-cols-2 md:gap-20 md:py-24">
        {/* Hero content */}
        <div className="flex flex-col justify-center">
          <span className="eyebrow mb-6">⚓ Single-question assessment</span>
          <h1 className="display-xl mb-6">
            Chart your course.
            <br />
            <span className="text-blueprint-cyan">Answer one question.</span>
          </h1>
          <p className="lede mb-10">
            Verify by mobile. Receive exactly one marine & naval architecture
            question. Submit your answer and see your result instantly — themed
            in the language of shipyards and blueprints.
          </p>
          <div className="hidden gap-6 text-sm text-anchor-steel md:flex">
            <FeatureBadge label="OTP-verified" />
            <FeatureBadge label="One question" />
            <FeatureBadge label="Instant result" />
          </div>
        </div>

        {/* Form */}
        <div className="flex flex-col justify-center">
          <form onSubmit={onSubmit} className="panel space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="display-md">Set sail</h2>
              <CompassMark size={52} />
            </div>
            <p className="small text-anchor-steel">
              We'll send a 6-digit code to your mobile to verify you.
            </p>

            <div className="flex gap-3">
              <div className="w-28">
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
                  placeholder="98765 43210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  className="input"
                  required
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 text-sm text-anchor-steel">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-blueprint-cyan/50 bg-deep-sea accent-blueprint-cyan"
              />
              <span>
                I consent to receive a one-time SMS code and to the processing
                of my mobile number per the{' '}
                <a href="#" className="text-blueprint-cyan underline">
                  privacy notice
                </a>
                .
              </span>
            </label>

            {error && <div className="alert-error">{error}</div>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending code…' : 'Send OTP →'}
            </button>

            <p className="text-center text-xs text-anchor-steel">
              By continuing, you accept a single-attempt assessment.
            </p>
          </form>
        </div>
      </section>
    </Shell>
  );
}

function FeatureBadge({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-blueprint-cyan" />
      <span>{label}</span>
    </div>
  );
}
