'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
    <div className="mx-auto mt-24 max-w-sm">
      <div className="card space-y-4">
        <h1 className="headline text-center">Admin Bridge</h1>
        <form onSubmit={onSubmit} className="space-y-4">
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
          {error && (
            <div className="rounded bg-coral-red/20 p-3 text-sm text-coral-red">{error}</div>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
