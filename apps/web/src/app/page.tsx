'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { CompassMark } from '@/components/CompassMark';
import { api, type ApiError } from '@/lib/api';
import { usePublicSettings } from '@/lib/public-settings';

export default function LandingPage() {
  const router = useRouter();
  const settings = usePublicSettings();

  if (!settings) {
    return (
      <Shell>
        <section className="shell-hero py-24">
          <div className="mx-auto max-w-lg text-center">
            <div className="shimmer mx-auto h-3 w-40 rounded-full" />
            <h1 className="display-lg mt-8">Warming up the compass…</h1>
          </div>
        </section>
      </Shell>
    );
  }

  return settings.event.collectMobile ? (
    <MobileGate onReady={router.push} />
  ) : (
    <KioskGate onReady={router.push} boothName={settings.event.boothName} />
  );
}

/* -------- Kiosk / guest (walk-up) -------- */

function KioskGate({
  onReady,
  boothName,
}: {
  onReady: (href: string) => void;
  boothName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setErr(null);
    try {
      await api('/candidates/guest', { method: 'POST' });
      onReady('/reveal');
    } catch (e) {
      setErr((e as ApiError).message ?? 'Could not start.');
      setLoading(false);
    }
  }

  return (
    <Shell
      topRight={
        <Link href="/admin/login" className="btn-ghost text-sm">
          Admin →
        </Link>
      }
    >
      <section className="shell-hero flex-col py-16 md:py-24">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center text-center">
          <span className="eyebrow mb-4">{boothName}</span>
          <h1 className="display-xl mb-6">
            Can you read
            <br />
            <span className="text-blueprint-cyan">the tide?</span>
          </h1>
          <p className="lede mx-auto mb-10 text-center">
            One marine & naval architecture question stands between you and the
            brass medal. Tap below, make your best call, and see how you fare.
          </p>

          <button
            onClick={start}
            disabled={loading}
            className="btn-primary text-2xl px-14 py-6 shadow-xl"
          >
            {loading ? 'Weighing anchor…' : '⚓ Take the challenge'}
          </button>
          {err && <div className="alert-error mt-6">{err}</div>}

          <div className="mt-16 hidden md:block">
            <CompassMark size={220} />
          </div>

          <div className="mt-10 flex flex-wrap gap-8 text-sm text-anchor-steel">
            <FeatureBadge label="No sign-up" />
            <FeatureBadge label="One question" />
            <FeatureBadge label="Instant result" />
          </div>
        </div>
      </section>
    </Shell>
  );
}

/* -------- Mobile + OTP flow (admin-enabled) -------- */

function MobileGate({ onReady }: { onReady: (href: string) => void }) {
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
      onReady('/otp');
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
          Admin →
        </Link>
      }
    >
      <section className="shell-hero grid grid-cols-1 gap-14 py-14 md:grid-cols-2 md:gap-20 md:py-24">
        <div className="flex flex-col justify-center">
          <span className="eyebrow mb-6">⚓ One-question challenge</span>
          <h1 className="display-xl mb-6">
            Can you read
            <br />
            <span className="text-blueprint-cyan">the tide?</span>
          </h1>
          <p className="lede mb-10">
            Verify by mobile, receive one marine & naval architecture question,
            and claim your brass medal if you nail it.
          </p>
          <div className="hidden gap-6 text-sm text-anchor-steel md:flex">
            <FeatureBadge label="OTP-verified" />
            <FeatureBadge label="One question" />
            <FeatureBadge label="Instant result" />
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <form onSubmit={onSubmit} className="panel space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="display-md">Set sail</h2>
              <CompassMark size={52} />
            </div>
            <p className="small text-anchor-steel">
              We'll send a 6-digit code to your mobile.
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
