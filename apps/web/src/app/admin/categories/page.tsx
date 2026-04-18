'use client';

import { useEffect, useState } from 'react';
import { api, type ApiError } from '@/lib/api';

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
};

export default function AdminCategoriesPage() {
  const [rows, setRows] = useState<Category[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: '', slug: '', description: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const r = await api<{ rows: Category[] }>('/admin/categories');
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
    if (!draft.name.trim()) return;
    setSaving(true);
    try {
      const slug =
        draft.slug.trim() ||
        draft.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      await api('/admin/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: draft.name.trim(),
          slug,
          description: draft.description.trim() || null,
        }),
      });
      setDraft({ name: '', slug: '', description: '' });
      load();
    } catch (e) {
      setErr((e as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(c: Category) {
    try {
      await api(`/admin/categories/${c.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !c.isActive }),
      });
      load();
    } catch (e) {
      setErr((e as ApiError).message);
    }
  }

  async function remove(c: Category) {
    if (!confirm(`Delete category "${c.name}"?`)) return;
    try {
      await api(`/admin/categories/${c.id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setErr((e as ApiError).message);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <span className="eyebrow">Content</span>
        <h1 className="display-lg mt-2">Categories</h1>
      </div>

      {err && <div className="alert-error">{err}</div>}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <form onSubmit={create} className="panel space-y-4 md:col-span-1">
          <h2 className="display-md">New category</h2>
          <div>
            <label className="label">Name</label>
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Slug (optional)</label>
            <input
              value={draft.slug}
              onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
              className="input"
              placeholder="auto-generated from name"
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              className="input min-h-[5rem]"
            />
          </div>
          <button disabled={saving} className="btn-primary w-full">
            {saving ? 'Creating…' : 'Create category'}
          </button>
        </form>

        <div className="panel md:col-span-2">
          <h2 className="display-md mb-4">Existing</h2>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td className="font-display text-lg">{c.name}</td>
                    <td className="font-mono text-anchor-steel">{c.slug}</td>
                    <td>
                      <span className={c.isActive ? 'pill-green' : 'pill-red'}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-right">
                      <button onClick={() => toggle(c)} className="btn-ghost text-xs">
                        {c.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => remove(c)}
                        className="btn-ghost text-xs text-coral-red"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-anchor-steel">
                      No categories yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
