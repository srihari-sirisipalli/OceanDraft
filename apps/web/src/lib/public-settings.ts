'use client';

import { useEffect, useState } from 'react';
import { api } from './api';

export type PublicSettings = {
  event: {
    kioskMode: boolean;
    collectMobile: boolean;
    autoResetSeconds: number;
    boothName: string;
  };
  branding: { productName: string };
  captcha: { enabled: boolean };
  result: { revealCorrectOnFail: boolean };
};

const FALLBACK: PublicSettings = {
  event: {
    kioskMode: true,
    collectMobile: false,
    autoResetSeconds: 10,
    boothName: 'OceanDraft · Event booth',
  },
  branding: { productName: 'OceanDraft' },
  captcha: { enabled: false },
  result: { revealCorrectOnFail: false },
};

export function usePublicSettings(): PublicSettings | null {
  const [s, setS] = useState<PublicSettings | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api<PublicSettings>('/settings/public');
        if (!cancelled) setS(r);
      } catch {
        if (!cancelled) setS(FALLBACK);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return s;
}
