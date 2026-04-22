export type SceneVariant =
  | 'reveal'
  | 'question'
  | 'result-correct'
  | 'result-wrong'
  | 'timeout'
  | 'default';

export type SceneCtx = {
  variant: SceneVariant;
  categorySlug?: string | null;
  timeTakenMs?: number | null;
  timeLimitSeconds?: number | null;
};

// Must match NUM_VARIANTS in ShipBackground.tsx. Kept in sync manually.
const COUNT: Record<SceneVariant, number> = {
  reveal: 3,
  question: 5,
  'result-correct': 3,
  'result-wrong': 4,
  timeout: 3,
  default: 2,
};

// Category slug → preferred flavor index per variant. Only the variant-
// specific entries that change behavior are listed; absent entries fall
// through to the performance tier (for correct) or random fallback.
const TOPIC_MAP: Record<string, Partial<Record<SceneVariant, number>>> = {
  navigation: { reveal: 1, question: 1 },
  'maritime-law': { reveal: 1, question: 1 },
  'marine-safety': { question: 3 },
  propulsion: { question: 0 },
  'marine-engineering': { question: 0 },
  'ship-construction': { question: 0 },
  'hull-design': { question: 2 },
  'ship-stability': { question: 2 },
  'cargo-deck': { question: 0 },
  'ship-trivia': { question: 4 },
  'general-na': { question: 4 },
};

export function pickSceneFlavor(ctx: SceneCtx): number {
  const max = COUNT[ctx.variant];

  // 1. Topic-aware
  if (ctx.categorySlug) {
    const prefs = TOPIC_MAP[ctx.categorySlug];
    if (!prefs && typeof console !== 'undefined' && process.env.NODE_ENV !== 'production') {
      // Missing from the map usually means a newly seeded category not yet
      // wired here. Loud in dev, silent in production.
      console.warn('[scene-picker] unknown category slug:', ctx.categorySlug);
    }
    const idx = prefs?.[ctx.variant];
    if (idx != null && idx < max) return idx;
  }

  // 2. Performance-aware (correct only)
  if (ctx.variant === 'result-correct') {
    const limitMs = (ctx.timeLimitSeconds ?? 0) * 1000;
    const taken = ctx.timeTakenMs ?? null;
    if (limitMs > 0 && taken != null) {
      const ratio = taken / limitMs;
      if (ratio < 0.25) return 1; // blazing fast → dolphins/fireworks (CorrectB)
      if (ratio < 0.75) return 0; // steady → harbor sunset (CorrectA)
      return 2; // barely made it → fleet returning (CorrectC)
    }
  }

  // 3. Deterministic default for wrong-answer scenes — pin to RoughSeas
  // (index 3) so the user sees the vivid storm rather than a random
  // fragment from the abstract scenes.
  if (ctx.variant === 'result-wrong') return 3;

  // 4. Random fallback for remaining variants
  return Math.floor(Math.random() * max);
}
