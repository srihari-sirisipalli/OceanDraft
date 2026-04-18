'use client';

import { useEffect, useState } from 'react';
import { api, type ApiError } from '@/lib/api';

type Template = {
  id: string;
  key: string;
  headline: string;
  bodyMarkdown: string;
  mediaId: string | null;
  revealCorrectOnFail: boolean;
  isActive: boolean;
};

export default function ResultTemplatesPage() {
  const [rows, setRows] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Template | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const r = await api<{ rows: Template[] }>('/admin/result-templates');
      setRows(r.rows);
    } catch (e) {
      setErr((e as ApiError).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!editing) return;
    setSaving(true);
    setErr(null);
    try {
      await api(`/admin/result-templates/${editing.key}`, {
        method: 'PATCH',
        body: JSON.stringify({
          headline: editing.headline,
          bodyMarkdown: editing.bodyMarkdown,
          revealCorrectOnFail: editing.revealCorrectOnFail,
          isActive: editing.isActive,
        }),
      });
      setEditing(null);
      load();
    } catch (e) {
      setErr((e as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <span className="eyebrow">Candidate-facing</span>
        <h1 className="display-lg mt-2">Result templates</h1>
        <p className="lede mt-3">
          Control the headline and message shown on the Hooray (pass) and Fail
          pages. Toggle whether the correct answer is revealed on failure.
        </p>
      </div>

      {err && <div className="alert-error">{err}</div>}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {rows.map((t) => (
          <div
            key={t.id}
            className={`panel flex flex-col gap-3 ${
              t.key === 'HOORAY_DEFAULT'
                ? 'border-foam-green/40'
                : 'border-coral-red/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span
                  className={
                    t.key === 'HOORAY_DEFAULT' ? 'pill-green' : 'pill-red'
                  }
                >
                  {t.key}
                </span>
              </div>
              <span className={t.isActive ? 'pill-green' : 'pill-red'}>
                {t.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>
              <div className="eyebrow mb-1">Headline</div>
              <div className="font-display text-2xl">{t.headline}</div>
            </div>
            <div>
              <div className="eyebrow mb-1">Body</div>
              <p className="whitespace-pre-wrap text-sail-white/90">
                {t.bodyMarkdown}
              </p>
            </div>
            {t.key === 'FAIL_DEFAULT' && (
              <div>
                <div className="eyebrow mb-1">Reveal correct answer on fail</div>
                <div>
                  {t.revealCorrectOnFail ? (
                    <span className="pill-green">Yes</span>
                  ) : (
                    <span className="pill-red">No</span>
                  )}
                </div>
              </div>
            )}
            <button
              onClick={() => setEditing(t)}
              className="btn-secondary mt-3 self-start"
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      {editing && (
        <div className="panel space-y-4">
          <h2 className="display-md">Edit {editing.key}</h2>
          <div>
            <label className="label">Headline</label>
            <input
              value={editing.headline}
              onChange={(e) =>
                setEditing({ ...editing, headline: e.target.value })
              }
              className="input"
              maxLength={140}
            />
          </div>
          <div>
            <label className="label">Body (markdown-light)</label>
            <textarea
              value={editing.bodyMarkdown}
              onChange={(e) =>
                setEditing({ ...editing, bodyMarkdown: e.target.value })
              }
              className="input min-h-[8rem]"
            />
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.isActive}
                onChange={(e) =>
                  setEditing({ ...editing, isActive: e.target.checked })
                }
                className="h-5 w-5 accent-blueprint-cyan"
              />
              Active
            </label>
            {editing.key === 'FAIL_DEFAULT' && (
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.revealCorrectOnFail}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      revealCorrectOnFail: e.target.checked,
                    })
                  }
                  className="h-5 w-5 accent-foam-green"
                />
                Reveal correct answer on fail
              </label>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditing(null)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
