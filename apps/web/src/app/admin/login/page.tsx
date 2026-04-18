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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api('/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      router.push('/admin/dashboard');
    } catch (err) {
      setError((err as ApiError).message ?? 'Login failed.');
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
              />
            </div>
            {error && <div className="alert-error">{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
            <p className="text-center text-xs text-anchor-steel">
              Forgot password? Contact a super admin to reset.
            </p>
          </form>
        </div>
      </section>
    </Shell>
  );
}
