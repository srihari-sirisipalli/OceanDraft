'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useMemo, type ReactNode } from 'react';
import {
  playPageWhoosh,
  playPortholeChime,
  playSetSailHorn,
  playSpotlightBell,
  playTideRecede,
  playWaveCrash,
} from '@/lib/sound';
import { TRANSITIONS, pickTransition, type TransitionName } from './transitions';

const SOUND_FOR: Record<TransitionName, () => void> = {
  setSail: playSetSailHorn,
  portholeOpen: playPortholeChime,
  spotlight: playSpotlightBell,
  waveCrash: playWaveCrash,
  tideRecede: playTideRecede,
  drift: playPageWhoosh,
};

const REDUCED: TransitionName = 'drift';

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const prevPath = useRef<string | null>(null);
  const reducedMotion = useReducedMotion();

  const chosen = useMemo<TransitionName>(() => {
    if (reducedMotion) return REDUCED;
    let status: 'correct' | 'wrong' | null = null;
    if (typeof window !== 'undefined' && pathname.startsWith('/result/')) {
      const stashed = sessionStorage.getItem('od:lastResultStatus');
      if (stashed === 'correct' || stashed === 'wrong') status = stashed;
    }
    return pickTransition(prevPath.current, pathname, status);
  }, [pathname, reducedMotion]);

  useEffect(() => {
    SOUND_FOR[chosen]();
    prevPath.current = pathname;
  }, [pathname, chosen]);

  const cfg = TRANSITIONS[chosen];

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={cfg.variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={cfg.transition}
        className="min-h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
