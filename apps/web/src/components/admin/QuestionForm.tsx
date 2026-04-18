'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type ApiError } from '@/lib/api';
import { MediaPicker, type MediaItem } from './MediaPicker';

type Category = { id: string; name: string; slug: string };
type OptionDraft = { text: string; isCorrect: boolean };

type QuestionDraft = {
  title: string;
  stemMarkdown: string;
  categoryId: string;
  type: 'TEXT' | 'IMAGE' | 'MIXED';
  answerType: 'SINGLE' | 'MULTI';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  isActive: boolean;
  tags: string;
  timeLimitSeconds: number | null;
  options: OptionDraft[];
};

const blank: QuestionDraft = {
  title: '',
  stemMarkdown: '',
  categoryId: '',
  type: 'TEXT',
  answerType: 'SINGLE',
  difficulty: 'MEDIUM',
  isActive: true,
  tags: '',
  timeLimitSeconds: null,
  options: [
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ],
};

export function QuestionForm({
  mode,
  id,
}: {
  mode: 'create' | 'edit';
  id?: string;
}) {
  const router = useRouter();
  const [cats, setCats] = useState<Category[]>([]);
  const [draft, setDraft] = useState<QuestionDraft>(blank);
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const c = await api<{ rows: Category[] }>('/admin/categories');
        setCats(c.rows);
        if (mode === 'create' && c.rows[0]) {
          setDraft((d) => ({ ...d, categoryId: d.categoryId || c.rows[0].id }));
        }
      } catch (e) {
        setErr((e as ApiError).message);
      }
    })();
  }, [mode]);

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    (async () => {
      try {
        const q = await api<{
          title: string;
          stemMarkdown: string;
          categoryId: string;
          type: QuestionDraft['type'];
          answerType: QuestionDraft['answerType'];
          difficulty: QuestionDraft['difficulty'];
          isActive: boolean;
          tags: string[];
          timeLimitSeconds: number | null;
          options: { textMarkdown: string; isCorrect: boolean; orderIndex: number }[];
          primaryMedia: MediaItem | null;
        }>(`/admin/questions/${id}`);
        setDraft({
          title: q.title,
          stemMarkdown: q.stemMarkdown,
          categoryId: q.categoryId,
          type: q.type,
          answerType: q.answerType ?? 'SINGLE',
          difficulty: q.difficulty,
          isActive: q.isActive,
          tags: q.tags.join(', '),
          timeLimitSeconds: q.timeLimitSeconds ?? null,
          options: q.options
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((o) => ({ text: o.textMarkdown, isCorrect: o.isCorrect })),
        });
        setMedia(q.primaryMedia);
      } catch (e) {
        setErr((e as ApiError).message);
      }
    })();
  }, [mode, id]);

  function setCorrect(i: number) {
    setDraft((d) => {
      if (d.answerType === 'MULTI') {
        return {
          ...d,
          options: d.options.map((o, idx) =>
            idx === i ? { ...o, isCorrect: !o.isCorrect } : o,
          ),
        };
      }
      return {
        ...d,
        options: d.options.map((o, idx) => ({ ...o, isCorrect: idx === i })),
      };
    });
  }
  function addOption() {
    if (draft.options.length >= 6) return;
    setDraft((d) => ({ ...d, options: [...d.options, { text: '', isCorrect: false }] }));
  }
  function removeOption(i: number) {
    if (draft.options.length <= 2) return;
    setDraft((d) => {
      const next = d.options.filter((_, idx) => idx !== i);
      if (!next.some((o) => o.isCorrect)) next[0].isCorrect = true;
      return { ...d, options: next };
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!draft.title.trim() || !draft.stemMarkdown.trim() || !draft.categoryId) {
      setErr('Title, stem, and category are required.');
      return;
    }
    if (draft.options.some((o) => !o.text.trim())) {
      setErr('All option texts are required.');
      return;
    }
    const correctCount = draft.options.filter((o) => o.isCorrect).length;
    if (draft.answerType === 'SINGLE' && correctCount !== 1) {
      setErr('Single-select: exactly one option must be marked correct.');
      return;
    }
    if (draft.answerType === 'MULTI' && correctCount < 1) {
      setErr('Multi-select: at least one option must be marked correct.');
      return;
    }
    if (draft.type === 'IMAGE' && !media) {
      setErr('Image-type questions require an image.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: draft.title.trim(),
        stemMarkdown: draft.stemMarkdown,
        categoryId: draft.categoryId,
        type: draft.type,
        answerType: draft.answerType,
        difficulty: draft.difficulty,
        isActive: draft.isActive,
        primaryMediaId: media?.id ?? null,
        tags: draft.tags
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
        timeLimitSeconds: draft.timeLimitSeconds,
        options: draft.options.map((o) => ({
          text: o.text.trim(),
          isCorrect: o.isCorrect,
        })),
      };
      if (mode === 'create') {
        await api('/admin/questions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } else {
        await api(`/admin/questions/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }
      router.push('/admin/questions');
    } catch (e) {
      setErr((e as ApiError).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <span className="eyebrow">Content</span>
          <h1 className="display-lg mt-2">
            {mode === 'create' ? 'New question' : 'Edit question'}
          </h1>
        </div>
        <Link href="/admin/questions" className="btn-ghost">
          ← Back to list
        </Link>
      </div>

      {err && <div className="alert-error">{err}</div>}

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <div className="panel space-y-5">
            <div>
              <label className="label">Title (admin-only)</label>
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="input"
                maxLength={140}
                required
              />
            </div>
            <div>
              <label className="label">Question stem</label>
              <textarea
                value={draft.stemMarkdown}
                onChange={(e) => setDraft({ ...draft, stemMarkdown: e.target.value })}
                className="input min-h-[10rem]"
                required
              />
              <p className="helper">
                Shown to the candidate. Basic formatting (bold, italic) supported.
              </p>
            </div>
            <div>
              <label className="label">Primary image (optional for TEXT, required for IMAGE)</label>
              <MediaPicker value={media} onChange={setMedia} />
            </div>
          </div>

          <div className="panel space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="display-md">Options</h2>
              <button
                type="button"
                onClick={addOption}
                disabled={draft.options.length >= 6}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                + Add option
              </button>
            </div>
            {draft.options.map((o, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-xl border-2 p-3 transition ${
                  o.isCorrect
                    ? 'border-foam-green/60 bg-foam-green/5'
                    : 'border-blueprint-cyan/20 bg-deep-sea/30'
                }`}
              >
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type={draft.answerType === 'MULTI' ? 'checkbox' : 'radio'}
                    name={draft.answerType === 'MULTI' ? `correct-${i}` : 'correct'}
                    checked={o.isCorrect}
                    onChange={() => setCorrect(i)}
                    className="h-4 w-4 accent-foam-green"
                  />
                  <span className="font-mono">{String.fromCharCode(65 + i)}</span>
                </label>
                <input
                  value={o.text}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      options: draft.options.map((x, idx) =>
                        idx === i ? { ...x, text: e.target.value } : x,
                      ),
                    })
                  }
                  className="input flex-1"
                  placeholder="Option text"
                  required
                />
                {draft.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="btn-ghost text-sm text-coral-red"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <p className="helper">
              2 to 6 options. Exactly one must be marked correct.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel space-y-4">
            <div>
              <label className="label">Category</label>
              <select
                value={draft.categoryId}
                onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}
                className="input"
                required
              >
                <option value="">Select…</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Presentation</label>
              <select
                value={draft.type}
                onChange={(e) =>
                  setDraft({ ...draft, type: e.target.value as QuestionDraft['type'] })
                }
                className="input"
              >
                <option value="TEXT">Text only</option>
                <option value="IMAGE">Image</option>
                <option value="MIXED">Text + image</option>
              </select>
            </div>
            <div>
              <label className="label">Answer type</label>
              <select
                value={draft.answerType}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    answerType: e.target.value as QuestionDraft['answerType'],
                  })
                }
                className="input"
              >
                <option value="SINGLE">Single-correct (radio)</option>
                <option value="MULTI">Multi-select (checkboxes)</option>
              </select>
              <p className="helper">
                Multi-select is correct only when the visitor picks every
                correct option — no more, no less.
              </p>
            </div>
            <div>
              <label className="label">Difficulty</label>
              <select
                value={draft.difficulty}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    difficulty: e.target.value as QuestionDraft['difficulty'],
                  })
                }
                className="input"
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
            <div>
              <label className="label">Tags (comma-separated)</label>
              <input
                value={draft.tags}
                onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                className="input"
                placeholder="stability, gm"
              />
            </div>
            <div>
              <label className="label">Time limit (seconds)</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={5}
                  max={600}
                  value={draft.timeLimitSeconds ?? ''}
                  placeholder="untimed"
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      timeLimitSeconds:
                        e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  className="input flex-1"
                />
                {draft.timeLimitSeconds != null && (
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, timeLimitSeconds: null })}
                    className="btn-ghost text-xs"
                  >
                    Untimed
                  </button>
                )}
              </div>
              <p className="helper">
                Visitors see a countdown; attempt is auto-expired if time runs
                out. Leave blank for no limit.
              </p>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
                className="h-5 w-5 accent-blueprint-cyan"
              />
              Active (eligible for assignment)
            </label>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading
              ? 'Saving…'
              : mode === 'create'
                ? 'Create question →'
                : 'Save changes →'}
          </button>
        </div>
      </form>
    </div>
  );
}
