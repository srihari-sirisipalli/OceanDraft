'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { CompassMark } from '@/components/CompassMark';
import { api, type ApiError } from '@/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [needsMfa, setNeedsMfa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api('/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username,
          password,
          mfaCode: mfaCode || undefined,
        }),
      });
      router.push('/admin/dashboard');
    } catch (err) {
      const e = err as ApiError;
      if (e.code === 'MFA_REQUIRED') {
        setNeedsMfa(true);
        setError(null);
      } else {
        setError(e.message ?? 'Login failed.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <section className="shell-hero grid grid-cols-1 gap-16 py-16 md:grid-cols-2 md:gap-20 md:py-28">
        <div className="flex flex-col justify-center">
          <span className="eyebrow mb-6">Admin Bridge</span>
          <h1 className="display-xl mb-6">
            Command the fleet.
            <br />
            <span className="text-blueprint-cyan">Chart every attempt.</span>
          </h1>
          <p className="lede">
            Author questions, steer assignment logic, audit every attempt.
            Sign in to the OceanDraft bridge.
          </p>
          <div className="mt-10 hidden md:block">
            <CompassMark size={180} />
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <form onSubmit={onSubmit} className="panel space-y-6">
            <h2 className="display-md">Sign in</h2>
            <div>
              <label className="label" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input"
                autoComplete="username"
                disabled={needsMfa}
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                autoComplete="current-password"
                required
                disabled={needsMfa}
              />
            </div>
            {needsMfa && (
              <div>
                <label className="label" htmlFor="mfa">
                  Authenticator code
                </label>
                <input
                  id="mfa"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="input font-mono text-center text-2xl tracking-[0.5em]"
                  placeholder="——————"
                  required
                  autoFocus
                />
                <p className="helper">From your authenticator app (TOTP).</p>
              </div>
            )}
            {error && <div className="alert-error">{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in…' : needsMfa ? 'Verify & continue →' : 'Sign in →'}
            </button>
            {needsMfa && (
              <button
                type="button"
                onClick={() => {
                  setNeedsMfa(false);
                  setMfaCode('');
                }}
                className="btn-ghost mx-auto block text-sm"
              >
                ← Back
              </button>
            )}
          </form>
        </div>
      </section>
    </Shell>
  );
}
