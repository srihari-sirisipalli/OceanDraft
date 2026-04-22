'use client';

import { useEffect, useState } from 'react';
import { isSoundEnabled, setSoundEnabled } from '@/lib/sound';

export function MuteButton() {
  const [on, setOn] = useState(true);

  useEffect(() => {
    setOn(isSoundEnabled());
  }, []);

  const toggle = () => {
    const next = !on;
    setOn(next);
    setSoundEnabled(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={on ? 'Mute sound' : 'Unmute sound'}
      title={on ? 'Mute sound' : 'Unmute sound'}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-blueprint-cyan/30 bg-deep-sea/60 text-blueprint-cyan transition hover:bg-blueprint-cyan/10"
    >
      {on ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 5 L6 9 H3 v6 h3 l5 4 Z" />
          <path d="M15 9 a4 4 0 0 1 0 6" />
          <path d="M18 6 a8 8 0 0 1 0 12" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 5 L6 9 H3 v6 h3 l5 4 Z" />
          <path d="M16 9 l5 6 M21 9 l-5 6" />
        </svg>
      )}
    </button>
  );
}
