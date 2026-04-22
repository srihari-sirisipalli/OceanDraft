import type { Transition, Variants } from 'framer-motion';

export type TransitionName =
  | 'setSail'
  | 'portholeOpen'
  | 'spotlight'
  | 'waveCrash'
  | 'tideRecede'
  | 'drift';

export type TransitionConfig = {
  variants: Variants;
  transition: Transition;
};

const ease: [number, number, number, number] = [0.22, 0.61, 0.36, 1];

export const TRANSITIONS: Record<TransitionName, TransitionConfig> = {
  setSail: {
    variants: {
      initial: { opacity: 0, scale: 0.9, rotate: -6, filter: 'blur(6px)' },
      animate: { opacity: 1, scale: 1, rotate: 0, filter: 'blur(0px)' },
      exit: { opacity: 0, scale: 1.05, rotate: 4, filter: 'blur(6px)' },
    },
    transition: { duration: 0.55, ease },
  },
  portholeOpen: {
    variants: {
      initial: {
        opacity: 0,
        clipPath: 'circle(0% at 50% 50%)',
      },
      animate: {
        opacity: 1,
        clipPath: 'circle(150% at 50% 50%)',
      },
      exit: {
        opacity: 0,
        clipPath: 'circle(0% at 50% 50%)',
      },
    },
    transition: { duration: 0.65, ease },
  },
  spotlight: {
    variants: {
      initial: {
        opacity: 0,
        scale: 1.18,
        filter: 'brightness(2) saturate(1.6) blur(4px)',
      },
      animate: {
        opacity: 1,
        scale: 1,
        filter: 'brightness(1) saturate(1) blur(0px)',
      },
      exit: { opacity: 0, scale: 1.04 },
    },
    transition: { duration: 0.6, ease },
  },
  waveCrash: {
    variants: {
      initial: { opacity: 0, x: 180, skewX: -6 },
      animate: { opacity: 1, x: 0, skewX: 0 },
      exit: { opacity: 0, x: -120, skewX: 4 },
    },
    transition: { duration: 0.55, ease },
  },
  tideRecede: {
    variants: {
      initial: { opacity: 0, scale: 1.04 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.94, y: 24 },
    },
    transition: { duration: 0.45, ease },
  },
  drift: {
    variants: {
      initial: { opacity: 0, y: 24, scale: 0.98 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: -16, scale: 0.98 },
    },
    transition: { duration: 0.35, ease },
  },
};

// Pick a transition name based on the "from → to" pathname pair.
export function pickTransition(
  from: string | null,
  to: string,
  status?: 'correct' | 'wrong' | null,
): TransitionName {
  const isResult = to.startsWith('/result/');
  const wasLanding = from === '/' || from === '' || from == null;
  const toLanding = to === '/';

  if (toLanding) return 'tideRecede';
  if (wasLanding && (to === '/reveal' || to === '/captcha' || to === '/otp')) {
    return 'setSail';
  }
  if (from === '/reveal' && to === '/question') return 'portholeOpen';
  if (from === '/question' && isResult) {
    return status === 'correct' ? 'spotlight' : 'waveCrash';
  }
  return 'drift';
}
