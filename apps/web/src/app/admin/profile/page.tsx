'use client';

import { useEffect, useState } from 'react';
import { api, type ApiError } from '@/lib/api';

type Me = { adminId: string; roles: string[] };

export default function AdminProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupUrl, setSetupUrl] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await api<Me>('/admin/auth/me');
        setMe(r);
      } catch (e) {
        setErr((e as ApiError).message);
      }
    })();
  }, []);

  async function startMfa() {
    if (!me) return;
    try {
      const r = await api<{ secret: string; otpauthUrl: string }>(
        `/admin/users/${me.adminId}/mfa/setup`,
        { method: 'POST' },
      );
      setSetupSecret(r.secret);
      setSetupUrl(r.otpauthUrl);
      setVerified(false);
    } catch (e) {
      setErr((e as ApiError).message);
    }
  }

  async function verifyMfa() {
    if (!me) return;
    try {
      await api(`/admin/users/${me.adminId}/mfa/verify`, {
        method: 'POST',
        body: JSON.stringify({ code: verifyCode }),
      });
      setVerified(true);
      setSetupSecret(null);
      setSetupUrl(null);
    } catch (e) {
      setErr((e as ApiError).message);
    }
  }

  async function disableMfa() {
    if (!me) return;
    if (!confirm('Disable MFA for your account?')) return;
    try {
      await api(`/admin/users/${me.adminId}/mfa/disable`, { method: 'POST' });
      setVerified(false);
    } catch (e) {
      setErr((e as ApiError).message);
    }
  }

  const qrSrc = setupUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(setupUrl)}`
    : null;

  return (
    <div className="space-y-8">
      <div>
        <span className="eyebrow">Account</span>
        <h1 className="display-lg mt-2">My profile</h1>
      </div>

      {err && <div className="alert-error">{err}</div>}

      <div className="panel space-y-4 md:max-w-xl">
        <h2 className="display-md">Session</h2>
        <KV k="Admin ID" v={me?.adminId ?? '…'} mono />
        <KV k="Roles" v={me?.roles?.join(', ') ?? '…'} />
      </div>

      <div className="panel space-y-5 md:max-w-xl">
        <h2 className="display-md">Two-factor authentication</h2>
        <p className="helper">
          Add a TOTP authenticator (Google Authenticator, 1Password, Authy).
          When enabled, you'll be asked for a 6-digit code at login.
        </p>

        {!setupSecret && !verified && (
          <button onClick={startMfa} className="btn-primary">
            Enable MFA
          </button>
        )}

        {setupSecret && (
          <div className="space-y-3 rounded-xl border border-blueprint-cyan/20 p-4">
            <p className="small">
              Scan this QR code with your authenticator, or enter the secret
              manually.
            </p>
            {qrSrc && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={qrSrc}
                alt="MFA QR"
                className="mx-auto rounded border border-blueprint-cyan/20 bg-white p-2"
              />
            )}
            <code className="block break-all rounded bg-deep-sea/60 p-2 font-mono text-sm">
              {setupSecret}
            </code>
            <div className="flex gap-2">
              <input
                placeholder="Enter 6-digit code"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                className="input flex-1"
              />
              <button onClick={verifyMfa} className="btn-primary">
                Verify
              </button>
            </div>
          </div>
        )}

        {verified && (
          <div className="space-y-3">
            <div className="alert-success">✓ MFA is now enabled.</div>
            <button onClick={disableMfa} className="btn-ghost text-coral-red">
              Disable MFA
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="eyebrow">{k}</span>
      <span className={`text-sm ${mono ? 'font-mono' : ''}`}>{v}</span>
    </div>
  );
}
