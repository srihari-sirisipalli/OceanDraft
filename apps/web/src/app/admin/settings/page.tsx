'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, type ApiError } from '@/lib/api';

/* Known settings — grouped for a human-friendly form. */
type FieldKind =
  | { kind: 'bool' }
  | { kind: 'int'; min?: number; max?: number; step?: number }
  | { kind: 'string' }
  | { kind: 'url' }
  | { kind: 'enum'; options: { value: string; label: string }[] };

type Field = {
  key: string;
  label: string;
  help?: string;
  type: FieldKind;
};

type Section = { title: string; fields: Field[] };

const SECTIONS: Section[] = [
  {
    title: 'Event booth',
    fields: [
      {
        key: 'event.kiosk_mode',
        label: 'Kiosk mode',
        help: 'Auto-reset to landing after the result page, friendlier copy.',
        type: { kind: 'bool' },
      },
      {
        key: 'event.collect_mobile',
        label: 'Collect mobile number + OTP',
        help: 'Turn off for pure walk-up (no sign-up) — visitors go straight to the question.',
        type: { kind: 'bool' },
      },
      {
        key: 'event.auto_reset_seconds',
        label: 'Auto-reset seconds',
        help: 'How long the result page stays before returning home in kiosk mode.',
        type: { kind: 'int', min: 3, max: 60 },
      },
      {
        key: 'event.booth_name',
        label: 'Booth name',
        help: 'Shown as the eyebrow text on the landing.',
        type: { kind: 'string' },
      },
    ],
  },
  {
    title: 'OTP & SMS',
    fields: [
      {
        key: 'otp.length',
        label: 'OTP length',
        type: { kind: 'int', min: 4, max: 8 },
      },
      {
        key: 'otp.expiry_seconds',
        label: 'OTP expiry (seconds)',
        type: { kind: 'int', min: 60, max: 900 },
      },
      {
        key: 'otp.max_resends_per_15m',
        label: 'Max resends per 15 minutes',
        type: { kind: 'int', min: 1, max: 10 },
      },
    ],
  },
  {
    title: 'Captcha',
    fields: [
      {
        key: 'captcha.enabled',
        label: 'Enabled',
        help: 'Adds a small arithmetic challenge after OTP.',
        type: { kind: 'bool' },
      },
      {
        key: 'captcha.type',
        label: 'Type',
        type: {
          kind: 'enum',
          options: [
            { value: 'ARITHMETIC', label: 'Arithmetic (e.g. 7 + 5)' },
            { value: 'RANDOM_DIGIT', label: 'Random 4-digit number' },
          ],
        },
      },
    ],
  },
  {
    title: 'Attempt & assignment',
    fields: [
      {
        key: 'attempt.policy',
        label: 'Per-mobile attempt policy',
        help: 'UNLIMITED recommended for events; SINGLE_* enforces one per mobile.',
        type: {
          kind: 'enum',
          options: [
            { value: 'UNLIMITED', label: 'Unlimited (recommended for events)' },
            { value: 'SINGLE_PER_DAY', label: 'Single attempt per day' },
            { value: 'SINGLE_LIFETIME', label: 'Single attempt ever' },
          ],
        },
      },
      {
        key: 'assignment.mode',
        label: 'Question assignment mode',
        help: 'ONE_TIME_USE_POOL = each question served to at most one visitor total. Make sure you have enough questions.',
        type: {
          kind: 'enum',
          options: [
            { value: 'ONE_TIME_USE_POOL', label: 'One-time pool (unique per visitor)' },
            { value: 'RANDOM_ACTIVE', label: 'Random from active pool (can repeat)' },
            { value: 'RANDOM_BY_CATEGORY', label: 'Random within a category' },
            { value: 'ALL_SAME', label: 'Everyone gets the same question' },
            { value: 'MANUAL_BY_MOBILE', label: 'Pre-assigned per mobile' },
          ],
        },
      },
    ],
  },
  {
    title: 'Result',
    fields: [
      {
        key: 'result.reveal_correct_on_fail',
        label: 'Reveal correct answer on fail',
        help: 'When on, the Rough-seas page tells them what the right option was.',
        type: { kind: 'bool' },
      },
      {
        key: 'result.auto_reset_fallback_enabled',
        label: 'Safety auto-reset',
        help: 'After a result is shown, reset the booth if no one interacts for a while. Activity resets the timer.',
        type: { kind: 'bool' },
      },
      {
        key: 'result.auto_reset_fallback_seconds',
        label: 'Safety reset delay (seconds)',
        help: 'How long to wait with no interaction before auto-returning to the landing page.',
        type: { kind: 'int', min: 30, max: 600 },
      },
    ],
  },
  {
    title: 'Branding',
    fields: [
      {
        key: 'branding.product_name',
        label: 'Product name',
        type: { kind: 'string' },
      },
      {
        key: 'branding.animations_enabled',
        label: 'Animations & scenes',
        help: 'Gates ship backgrounds, page transitions and confetti. Turn off if motion is an issue at the booth.',
        type: { kind: 'bool' },
      },
      {
        key: 'branding.sound_enabled',
        label: 'Sound effects',
        help: 'Global switch — visitors can still mute locally from the speaker icon.',
        type: { kind: 'bool' },
      },
      {
        key: 'branding.ambient_ocean_enabled',
        label: 'Ambient ocean drone',
        help: 'Low, quiet background drone while a visitor reads the question.',
        type: { kind: 'bool' },
      },
      {
        key: 'privacy.policy_url',
        label: 'Privacy policy URL',
        type: { kind: 'url' },
      },
    ],
  },
];

const TYPE_BY_KEY: Record<string, string> = Object.fromEntries(
  SECTIONS.flatMap((s) =>
    s.fields.map((f) => [f.key, f.type.kind === 'enum' ? 'enum' : f.type.kind]),
  ),
);

export default function AdminSettingsPage() {
  const [server, setServer] = useState<Record<string, unknown>>({});
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const r = await api<Record<string, unknown>>('/admin/settings');
      setServer(r);
      setDraft(r);
    } catch (e) {
      setErr((e as ApiError).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const dirtyKeys = useMemo(
    () =>
      Object.keys(draft).filter(
        (k) => JSON.stringify(draft[k]) !== JSON.stringify(server[k]),
      ),
    [draft, server],
  );
  const dirty = dirtyKeys.length > 0;

  function set(key: string, value: unknown) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setErr(null);
    setInfo(null);
    try {
      for (const k of dirtyKeys) {
        await api('/admin/settings', {
          method: 'PATCH',
          body: JSON.stringify({
            key: k,
            value: draft[k],
            type: TYPE_BY_KEY[k] ?? typeof draft[k],
          }),
        });
      }
      setInfo(`Saved ${dirtyKeys.length} change(s).`);
      load();
    } catch (e) {
      setErr((e as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setDraft(server);
  }

  const knownKeys = new Set(SECTIONS.flatMap((s) => s.fields.map((f) => f.key)));
  const extraKeys = Object.keys(draft)
    .filter((k) => !knownKeys.has(k))
    .sort();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Configuration</span>
          <h1 className="display-lg mt-2">Settings</h1>
          <p className="helper max-w-2xl">
            Control event behaviour, OTP, captcha, assignment policy, result
            templates and branding. Changes take effect immediately after save.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {dirty && (
            <button onClick={reset} className="btn-ghost">
              Discard
            </button>
          )}
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="btn-primary"
          >
            {saving
              ? 'Saving…'
              : dirty
                ? `Save ${dirtyKeys.length} change${dirtyKeys.length === 1 ? '' : 's'}`
                : 'No changes'}
          </button>
        </div>
      </div>

      {err && <div className="alert-error">{err}</div>}
      {info && <div className="alert-success">{info}</div>}

      {SECTIONS.map((section) => (
        <div key={section.title} className="panel">
          <h2 className="display-md mb-5">{section.title}</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {section.fields.map((f) => (
              <FieldRow
                key={f.key}
                field={f}
                value={draft[f.key]}
                onChange={(v) => set(f.key, v)}
              />
            ))}
          </div>
        </div>
      ))}

      {extraKeys.length > 0 && (
        <details className="panel">
          <summary className="cursor-pointer font-display text-xl">
            Advanced — other keys ({extraKeys.length})
          </summary>
          <p className="helper">
            Keys not known to the standard form. Shown as raw JSON so you can
            still tweak them.
          </p>
          <div className="mt-4 space-y-3">
            {extraKeys.map((k) => (
              <div key={k}>
                <label className="label">{k}</label>
                <input
                  value={JSON.stringify(draft[k] ?? '')}
                  onChange={(e) => {
                    try {
                      set(k, JSON.parse(e.target.value));
                    } catch {
                      set(k, e.target.value);
                    }
                  }}
                  className="input font-mono"
                />
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function FieldRow({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="label mb-1">{field.label}</label>
        <code className="text-[10px] font-mono text-anchor-steel">{field.key}</code>
      </div>
      <Control field={field} value={value} onChange={onChange} />
      {field.help && <p className="helper">{field.help}</p>}
    </div>
  );
}

function Control({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (field.type.kind) {
    case 'bool': {
      const on = !!value;
      return (
        <button
          type="button"
          onClick={() => onChange(!on)}
          className={`relative inline-flex h-8 w-16 items-center rounded-full transition ${
            on ? 'bg-blueprint-cyan' : 'bg-hull-navy/80'
          }`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-sail-white shadow transition ${
              on ? 'translate-x-9' : 'translate-x-1'
            }`}
          />
          <span className="ml-3 font-mono text-xs uppercase tracking-widest text-sail-white">
            {on ? 'On' : 'Off'}
          </span>
        </button>
      );
    }
    case 'int': {
      const cfg = field.type;
      return (
        <input
          type="number"
          className="input"
          value={(value as number) ?? ''}
          min={cfg.min}
          max={cfg.max}
          step={cfg.step ?? 1}
          onChange={(e) => {
            const v = e.target.value === '' ? '' : Number(e.target.value);
            onChange(v === '' ? 0 : v);
          }}
        />
      );
    }
    case 'string':
    case 'url':
      return (
        <input
          type={field.type.kind === 'url' ? 'url' : 'text'}
          className="input"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'enum':
      return (
        <select
          className="input"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          {field.type.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
  }
}
