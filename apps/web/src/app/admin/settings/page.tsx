'use client';

import { useEffect, useState } from 'react';
import { api, type ApiError } from '@/lib/api';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ key: string; value: string } | null>(null);

  async function load() {
    try {
      const r = await api<Record<string, unknown>>('/admin/settings');
      setSettings(r);
    } catch (e) {
      setErr((e as ApiError).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!editing) return;
    try {
      let parsed: unknown = editing.value;
      try {
        parsed = JSON.parse(editing.value);
      } catch {
        /* keep as string */
      }
      await api('/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          key: editing.key,
          value: parsed,
          type: typeof parsed,
        }),
      });
      setEditing(null);
      load();
    } catch (e) {
      setErr((e as ApiError).message);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="headline">App Settings</h1>
      {err && <div className="rounded bg-coral-red/20 p-3 text-coral-red">{err}</div>}

      <div className="card">
        <table className="w-full text-left text-sm">
          <thead className="text-anchor-steel">
            <tr>
              <th className="py-2">Key</th>
              <th className="py-2">Value</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(settings).map(([k, v]) => (
              <tr key={k} className="border-t border-blueprint-cyan/10">
                <td className="py-2 font-mono">{k}</td>
                <td className="py-2 font-mono">{JSON.stringify(v)}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() =>
                      setEditing({
                        key: k,
                        value: typeof v === 'string' ? v : JSON.stringify(v),
                      })
                    }
                    className="btn-secondary"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="card space-y-3">
          <h2 className="font-display text-xl">Edit {editing.key}</h2>
          <textarea
            className="input min-h-[6rem] font-mono"
            value={editing.value}
            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
          />
          <div className="flex gap-3">
            <button className="btn-primary" onClick={save}>
              Save
            </button>
            <button className="btn-secondary" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
