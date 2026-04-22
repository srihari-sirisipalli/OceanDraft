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
  branding: {
    productName: string;
    animationsEnabled: boolean;
    soundEnabled: boolean;
    ambientOceanEnabled: boolean;
  };
  captcha: { enabled: boolean };
  result: {
    revealCorrectOnFail: boolean;
    autoResetFallbackSeconds: number;
    autoResetFallbackEnabled: boolean;
  };
  privacy: { policyUrl: string };
};

const FALLBACK: PublicSettings = {
  event: {
    kioskMode: true,
    collectMobile: false,
    autoResetSeconds: 10,
    boothName: 'OceanDraft · Event booth',
  },
  branding: {
    productName: 'OceanDraft',
    animationsEnabled: true,
    soundEnabled: true,
    ambientOceanEnabled: true,
  },
  captcha: { enabled: false },
  result: {
    revealCorrectOnFail: false,
    autoResetFallbackSeconds: 120,
    autoResetFallbackEnabled: true,
  },
  privacy: { policyUrl: '/privacy' },
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
