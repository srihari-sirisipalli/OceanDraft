'use client';

import { useEffect, useRef, useState } from 'react';
import { api, type ApiError } from '@/lib/api';

export type MediaItem = {
  id: string;
  url: string;
  mimeType: string;
  altText: string | null;
  sizeBytes: number;
  originalName?: string;
};

export function MediaPicker({
  value,
  onChange,
}: {
  value: MediaItem | null;
  onChange: (m: MediaItem | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [altText, setAltText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [library, setLibrary] = useState<MediaItem[]>([]);
  const [showLib, setShowLib] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await api<{ rows: MediaItem[] }>('/admin/media?limit=24');
        setLibrary(r.rows);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      if (altText.trim()) body.append('altText', altText.trim());
      const res = await fetch('/api/v1/admin/media', {
        method: 'POST',
        credentials: 'include',
        body,
      });
      if (!res.ok) {
        let err: ApiError = { code: 'UPLOAD_FAILED', message: res.statusText };
        try {
          err = await res.json();
        } catch {
          /* ignore */
        }
        throw err;
      }
      const item = (await res.json()) as MediaItem;
      onChange({ ...item, altText: altText || null });
      setLibrary((prev) => [item, ...prev]);
      setAltText('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      setError((e as ApiError).message ?? 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      {value ? (
        <div className="flex items-start gap-4 rounded-xl border border-blueprint-cyan/30 bg-deep-sea/40 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value.url}
            alt={value.altText ?? ''}
            className="h-24 w-24 flex-none rounded-lg border border-blueprint-cyan/20 object-cover"
          />
          <div className="flex-1 space-y-1 text-sm">
            <div className="font-mono text-xs text-anchor-steel">{value.mimeType}</div>
            <div className="truncate text-anchor-steel">
              Alt: <span className="text-sail-white">{value.altText ?? '—'}</span>
            </div>
            <div className="text-xs text-anchor-steel">
              {(value.sizeBytes / 1024).toFixed(0)} KB
            </div>
          </div>
          <button
            type="button"
            className="btn-ghost text-xs text-coral-red"
            onClick={() => onChange(null)}
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-blueprint-cyan/30 bg-deep-sea/30 p-6 text-center">
          <div className="text-3xl">🖼️</div>
          <p className="mt-2 text-sm text-anchor-steel">
            PNG, JPEG or WebP · up to 2 MB
          </p>
        </div>
      )}

      <div className="space-y-2">
        <input
          type="text"
          className="input"
          placeholder="Alt text (recommended, announced to screen readers)"
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onPick}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="btn-secondary text-sm"
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : '⇡ Upload new'}
          </button>
          <button
            type="button"
            onClick={() => setShowLib((v) => !v)}
            className="btn-ghost text-sm"
          >
            {showLib ? 'Hide library' : `Pick from library (${library.length})`}
          </button>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {showLib && (
        <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
          {library.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m)}
              className="group relative aspect-square overflow-hidden rounded-lg border border-blueprint-cyan/20 hover:border-blueprint-cyan"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt={m.altText ?? ''} className="h-full w-full object-cover" />
            </button>
          ))}
          {library.length === 0 && (
            <div className="col-span-full py-6 text-center text-sm text-anchor-steel">
              Library is empty.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
