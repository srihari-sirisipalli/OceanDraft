'use client';

import { useEffect, useState } from 'react';
import { api, type ApiError } from '@/lib/api';

type AdminUser = {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  mfaEnabled: boolean;
  roles: string[];
  lastLoginAt: string | null;
  createdAt: string;
};

const ALL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'OPS', 'AUDITOR'] as const;

export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    username: '',
    email: '',
    password: '',
    roles: ['ADMIN'] as string[],
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const r = await api<{ rows: AdminUser[] }>('/admin/users');
      setRows(r.rows);
    } catch (e) {
      setErr((e as ApiError).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await api('/admin/users', { method: 'POST', body: JSON.stringify(draft) });
      setDraft({ username: '', email: '', password: '', roles: ['ADMIN'] });
      load();
    } catch (e) {
      setErr((e as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: AdminUser) {
    try {
      await api(`/admin/users/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      load();
    } catch (e) {
      setErr((e as ApiError).message);
    }
  }

  async function resetPassword(u: AdminUser) {
    const p = prompt(`New password for ${u.username} (min 12 chars):`);
    if (!p) return;
    try {
      await api(`/admin/users/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ password: p }),
      });
      alert('Password updated.');
    } catch (e) {
      alert((e as ApiError).message);
    }
  }

  async function remove(u: AdminUser) {
    if (!confirm(`Delete admin "${u.username}"?`)) return;
    try {
      await api(`/admin/users/${u.id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setErr((e as ApiError).message);
    }
  }

  function toggleRole(r: string) {
    setDraft((d) => ({
      ...d,
      roles: d.roles.includes(r) ? d.roles.filter((x) => x !== r) : [...d.roles, r],
    }));
  }

  return (
    <div className="space-y-8">
      <div>
        <span className="eyebrow">Access control</span>
        <h1 className="display-lg mt-2">Admin users</h1>
      </div>

      {err && <div className="alert-error">{err}</div>}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <form onSubmit={create} className="panel space-y-4 md:col-span-1">
          <h2 className="display-md">Create admin</h2>
          <div>
            <label className="label">Username</label>
            <input
              value={draft.username}
              onChange={(e) => setDraft({ ...draft, username: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Temporary password (≥ 12 chars)</label>
            <input
              type="text"
              value={draft.password}
              onChange={(e) => setDraft({ ...draft, password: e.target.value })}
              className="input font-mono"
              minLength={12}
              required
            />
          </div>
          <div>
            <label className="label">Roles</label>
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map((r) => {
                const on = draft.roles.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRole(r)}
                    className={on ? 'pill-cyan' : 'pill text-anchor-steel'}
                    style={!on ? { background: 'rgba(47,182,198,0.05)' } : undefined}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
          <button disabled={saving} className="btn-primary w-full">
            {saving ? 'Creating…' : 'Create admin'}
          </button>
        </form>

        <div className="panel overflow-x-auto md:col-span-2">
          <h2 className="display-md mb-4">Existing admins</h2>
          <table className="tbl">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Roles</th>
                <th>MFA</th>
                <th>Status</th>
                <th>Last login</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className="font-display text-lg">{u.username}</td>
                  <td className="font-mono text-sm">{u.email}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <span key={r} className="pill-cyan">
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    {u.mfaEnabled ? (
                      <span className="pill-green">ON</span>
                    ) : (
                      <span className="pill-red">OFF</span>
                    )}
                  </td>
                  <td>
                    <span className={u.isActive ? 'pill-green' : 'pill-red'}>
                      {u.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="text-anchor-steel">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '—'}
                  </td>
                  <td className="text-right">
                    <button onClick={() => toggleActive(u)} className="btn-ghost text-xs">
                      {u.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => resetPassword(u)} className="btn-ghost text-xs">
                      Reset PW
                    </button>
                    <button
                      onClick={() => remove(u)}
                      className="btn-ghost text-xs text-coral-red"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-anchor-steel">
                    No admins.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
