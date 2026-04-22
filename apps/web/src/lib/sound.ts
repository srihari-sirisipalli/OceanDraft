'use client';

/**
 * Ship-themed Web Audio synth — no asset files.
 *
 * Design notes:
 * - AudioContext is lazy-instantiated on first user gesture (autoplay policy).
 * - Mute state persists in localStorage['od:sound'] = '1' | '0'.
 * - Every play* returns immediately and schedules envelopes on ctx.currentTime
 *   to avoid setTimeout drift.
 * - All voices run through a shared master GainNode so mute is instant.
 *
 * Ship-related voices built by layering oscillators + noise:
 *   playReveal     →  ship's bell 3-strike roll with shimmer
 *   playCorrect    →  brass horn fanfare + triumphant bell
 *   playWrong      →  hull clank (metal hit + low thud)
 *   playTimeout    →  two-blast foghorn
 *   playTick       →  small ship-bell tink
 *   playPageWhoosh →  wave swoosh (filtered noise sweep)
 *   playSonarPing  →  sonar blip
 *   playSeagull    →  seagull cry
 *   playSplash     →  water splash
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;

const STORAGE_KEY = 'od:sound';

if (typeof window !== 'undefined') {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    enabled = v == null || v === '1';
  } catch {
    enabled = true;
  }
}

export function isSoundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(v: boolean) {
  enabled = v;
  if (master && ctx) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(v ? 1 : 0, ctx.currentTime, 0.05);
  }
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
    } catch {
      /* ignore */
    }
  }
}

function ensureCtx(): { c: AudioContext; m: GainNode } | null {
  if (typeof window === 'undefined') return null;
  if (!enabled) return null;
  if (!ctx) {
    const W = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctor = W.AudioContext ?? W.webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 1;
      master.connect(ctx.destination);
    } catch (e) {
      // Rare — some locked-down browsers block AudioContext. Surface it in
      // dev so a silent booth is traceable rather than mysterious.
      if (typeof console !== 'undefined' && process.env.NODE_ENV !== 'production') {
        console.warn('[sound] AudioContext unavailable:', e);
      }
      return null;
    }
  }
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return { c: ctx, m: master! };
}

type Envelope = { attack?: number; release?: number; peak?: number };

function envelope(g: GainNode, start: number, dur: number, opts: Envelope = {}) {
  const attack = opts.attack ?? 0.01;
  const release = opts.release ?? 0.1;
  const peak = opts.peak ?? 0.3;
  g.gain.cancelScheduledValues(start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(peak, start + attack);
  g.gain.setValueAtTime(peak, start + Math.max(attack, dur - release));
  g.gain.linearRampToValueAtTime(0.0001, start + dur);
}

function expDecay(g: GainNode, start: number, peak: number, tau: number) {
  g.gain.cancelScheduledValues(start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(peak, start + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, start + tau);
}

function tone(
  dest: AudioNode,
  freq: number,
  dur: number,
  when: number,
  type: OscillatorType,
  peak: number,
) {
  const c = ensureCtx();
  if (!c) return;
  const osc = c.c.createOscillator();
  const g = c.c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.c.currentTime + when);
  envelope(g, c.c.currentTime + when, dur, {
    attack: 0.02,
    release: 0.1,
    peak,
  });
  osc.connect(g).connect(dest);
  osc.start(c.c.currentTime + when);
  osc.stop(c.c.currentTime + when + dur + 0.05);
}

function sweep(
  dest: AudioNode,
  from: number,
  to: number,
  dur: number,
  when: number,
  type: OscillatorType,
  peak: number,
) {
  const c = ensureCtx();
  if (!c) return;
  const osc = c.c.createOscillator();
  const g = c.c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, c.c.currentTime + when);
  osc.frequency.exponentialRampToValueAtTime(
    Math.max(20, to),
    c.c.currentTime + when + dur,
  );
  envelope(g, c.c.currentTime + when, dur, {
    attack: 0.03,
    release: 0.15,
    peak,
  });
  osc.connect(g).connect(dest);
  osc.start(c.c.currentTime + when);
  osc.stop(c.c.currentTime + when + dur + 0.05);
}

function noise(
  dest: AudioNode,
  dur: number,
  when: number,
  peak: number,
  filter?: { type: BiquadFilterType; freq: number; Q?: number },
) {
  const c = ensureCtx();
  if (!c) return;
  const bufSize = Math.max(1, Math.floor(c.c.sampleRate * dur));
  const buf = c.c.createBuffer(1, bufSize, c.c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
  }
  const src = c.c.createBufferSource();
  src.buffer = buf;
  const g = c.c.createGain();
  envelope(g, c.c.currentTime + when, dur, {
    attack: 0.005,
    release: 0.05,
    peak,
  });
  if (filter) {
    const f = c.c.createBiquadFilter();
    f.type = filter.type;
    f.frequency.value = filter.freq;
    if (filter.Q != null) f.Q.value = filter.Q;
    src.connect(f).connect(g).connect(dest);
  } else {
    src.connect(g).connect(dest);
  }
  src.start(c.c.currentTime + when);
  src.stop(c.c.currentTime + when + dur + 0.05);
}

// ──────────────────────────────────────────────────────────────
// Ship's bell — metallic strike with harmonic partials
// ──────────────────────────────────────────────────────────────

function bell(dest: AudioNode, fundamental: number, when: number, gain = 0.4) {
  const c = ensureCtx();
  if (!c) return;
  const partials = [
    { f: fundamental, g: 1.0, tau: 2.2 },
    { f: fundamental * 2.0, g: 0.55, tau: 1.6 },
    { f: fundamental * 3.02, g: 0.35, tau: 1.0 },
    { f: fundamental * 4.1, g: 0.22, tau: 0.7 },
    { f: fundamental * 5.3, g: 0.12, tau: 0.5 },
  ];
  for (const p of partials) {
    const osc = c.c.createOscillator();
    const g = c.c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(p.f, c.c.currentTime + when);
    expDecay(g, c.c.currentTime + when, gain * p.g, p.tau);
    osc.connect(g).connect(dest);
    osc.start(c.c.currentTime + when);
    osc.stop(c.c.currentTime + when + p.tau + 0.05);
  }
  // soft strike transient
  noise(dest, 0.02, when, gain * 0.4, { type: 'highpass', freq: 3000 });
}

// ──────────────────────────────────────────────────────────────
// Brass ship horn — detuned sawtooth stack through lowpass
// ──────────────────────────────────────────────────────────────

function horn(
  dest: AudioNode,
  fundamental: number,
  dur: number,
  when: number,
  peak = 0.35,
) {
  const c = ensureCtx();
  if (!c) return;
  const lp = c.c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(900, c.c.currentTime + when);
  lp.Q.value = 0.7;
  lp.connect(dest);
  const g = c.c.createGain();
  g.connect(lp);
  envelope(g, c.c.currentTime + when, dur, {
    attack: 0.25,
    release: 0.4,
    peak,
  });
  // stacked oscillators for body
  const voices = [
    { f: fundamental, type: 'sawtooth' as OscillatorType, gain: 0.9 },
    { f: fundamental * 1.002, type: 'sawtooth' as OscillatorType, gain: 0.75 }, // detune
    { f: fundamental * 0.5, type: 'sine' as OscillatorType, gain: 0.6 }, // sub
    { f: fundamental * 2.0, type: 'sawtooth' as OscillatorType, gain: 0.25 },
  ];
  for (const v of voices) {
    const osc = c.c.createOscillator();
    osc.type = v.type;
    osc.frequency.setValueAtTime(v.f, c.c.currentTime + when);
    // slight pitch droop at release — very ship-horn
    osc.frequency.linearRampToValueAtTime(
      v.f * 0.97,
      c.c.currentTime + when + dur,
    );
    const og = c.c.createGain();
    og.gain.value = v.gain;
    osc.connect(og).connect(g);
    osc.start(c.c.currentTime + when);
    osc.stop(c.c.currentTime + when + dur + 0.05);
  }
}

// ──────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────

// Pick a uniformly-random element. Used to rotate between routines so the booth
// doesn't sound identical on every correct answer / reveal / etc.
function choose<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

// ──────────────────────────────────────────────────────────────
// Reveal — 3 routines
// ──────────────────────────────────────────────────────────────

function revealA(m: GainNode) {
  // Three-strike bell roll + clean pair.
  bell(m, 900, 0, 0.4);
  bell(m, 900, 0.35, 0.35);
  bell(m, 900, 0.7, 0.3);
  bell(m, 1100, 1.2, 0.5);
  bell(m, 700, 1.2, 0.4);
}
function revealB(m: GainNode) {
  // Sonar sweep rising + bell lock.
  sweep(m, 400, 1400, 0.9, 0, 'sine', 0.12);
  sweep(m, 600, 1800, 0.9, 0, 'triangle', 0.06);
  bell(m, 1300, 1.0, 0.55);
  bell(m, 850, 1.1, 0.35);
}
function revealC(m: GainNode) {
  // Short horn blast + bell strike.
  horn(m, 180, 0.55, 0, 0.34);
  horn(m, 240, 0.55, 0.35, 0.34);
  bell(m, 1200, 0.9, 0.5);
  bell(m, 800, 1.05, 0.32);
}
export function playReveal() {
  const c = ensureCtx();
  if (!c) return;
  choose([revealA, revealB, revealC])(c.m);
}

// ──────────────────────────────────────────────────────────────
// Correct — 3 big, long celebratory routines (~3s+)
// ──────────────────────────────────────────────────────────────

function correctA(m: GainNode) {
  // Rising fanfare → sustained G-major chord → bell cascade.
  horn(m, 196, 0.55, 0, 0.38);
  horn(m, 247, 0.65, 0.35, 0.42);
  horn(m, 294, 0.9, 0.75, 0.48);
  horn(m, 392, 1.0, 0.75, 0.22);
  horn(m, 294, 1.8, 1.4, 0.32);
  horn(m, 392, 1.8, 1.4, 0.28);
  horn(m, 494, 1.9, 1.4, 0.24);
  horn(m, 98, 2.0, 1.4, 0.3);
  bell(m, 1050, 0.1, 0.5);
  bell(m, 1400, 0.45, 0.42);
  bell(m, 2100, 0.9, 0.35);
  bell(m, 1050, 1.5, 0.5);
  bell(m, 1400, 1.9, 0.45);
  bell(m, 2100, 2.3, 0.38);
  bell(m, 1050, 2.8, 0.4);
  bell(m, 1400, 3.1, 0.32);
  noise(m, 0.7, 0.75, 0.1, { type: 'highpass', freq: 6000 });
  noise(m, 1.2, 1.4, 0.08, { type: 'highpass', freq: 5000 });
  noise(m, 0.8, 2.8, 0.06, { type: 'highpass', freq: 5500 });
}
function correctB(m: GainNode) {
  // Arpeggio fanfare — C major triad up, held, bell cadence descending.
  horn(m, 262, 0.4, 0, 0.4);   // C4
  horn(m, 330, 0.4, 0.25, 0.4); // E4
  horn(m, 392, 0.5, 0.5, 0.42); // G4
  horn(m, 523, 0.7, 0.8, 0.48); // C5
  // Sustained C major chord
  horn(m, 131, 1.8, 1.4, 0.3);  // C3 pedal
  horn(m, 262, 1.8, 1.4, 0.3);
  horn(m, 392, 1.9, 1.4, 0.28);
  horn(m, 523, 2.0, 1.4, 0.26);
  // Descending bell peal — C6 → G5 → E5 → C5
  bell(m, 1047, 0.3, 0.5);
  bell(m, 784, 0.9, 0.45);
  bell(m, 659, 1.5, 0.42);
  bell(m, 523, 2.1, 0.4);
  bell(m, 1047, 2.7, 0.5);
  bell(m, 1319, 3.0, 0.4);
  noise(m, 1.0, 1.3, 0.1, { type: 'highpass', freq: 5500 });
  noise(m, 0.9, 2.6, 0.08, { type: 'highpass', freq: 6000 });
}
function correctC(m: GainNode) {
  // Victory ship's bell carillon — 8-bell descending pattern over held horn.
  horn(m, 147, 3.3, 0, 0.32);   // D3 pedal held through
  horn(m, 220, 3.3, 0, 0.3);    // A3
  horn(m, 294, 3.3, 0.1, 0.28); // D4
  // Bell carillon — ascending then descending
  const bells = [
    [0.0, 880],
    [0.3, 1047],
    [0.6, 1319],
    [0.9, 1568],
    [1.3, 1319],
    [1.7, 1047],
    [2.1, 880],
    [2.5, 1047],
    [2.9, 1319],
  ] as const;
  for (const [t, f] of bells) bell(m, f, t, 0.42);
  // Final glory burst
  bell(m, 1760, 3.0, 0.5);
  noise(m, 0.9, 2.5, 0.1, { type: 'highpass', freq: 6000 });
}
export function playCorrect() {
  const c = ensureCtx();
  if (!c) return;
  choose([correctA, correctB, correctC])(c.m);
}

// ──────────────────────────────────────────────────────────────
// Wrong — 3 routines
// ──────────────────────────────────────────────────────────────

function wrongA(m: GainNode) {
  // Hull clank — low metal thud + high sparkle.
  tone(m, 90, 0.35, 0, 'sine', 0.45);
  tone(m, 60, 0.4, 0, 'triangle', 0.3);
  bell(m, 260, 0.05, 0.3);
  noise(m, 0.08, 0.02, 0.18, { type: 'bandpass', freq: 2500, Q: 2 });
}
function wrongB(m: GainNode) {
  // Deflated horn — descending minor third.
  horn(m, 220, 0.4, 0, 0.32);
  horn(m, 185, 0.6, 0.35, 0.36);
  tone(m, 80, 0.5, 0.4, 'sine', 0.28);
}
function wrongC(m: GainNode) {
  // Creaking timbers — bandpass-swept noise + low descent.
  noise(m, 0.35, 0, 0.14, { type: 'bandpass', freq: 800, Q: 6 });
  sweep(m, 180, 70, 0.5, 0.05, 'sawtooth', 0.22);
  bell(m, 180, 0.3, 0.25);
}
function wrongD(m: GainNode) {
  // Deep bell knell — slow, mournful, pairs with sunken-compass scene.
  bell(m, 110, 0, 0.5);
  bell(m, 110, 0.9, 0.42);
  bell(m, 82, 1.8, 0.4);
}
export function playWrong() {
  const c = ensureCtx();
  if (!c) return;
  choose([wrongA, wrongB, wrongC, wrongD])(c.m);
}

// ──────────────────────────────────────────────────────────────
// Timeout — 2 routines
// ──────────────────────────────────────────────────────────────

function timeoutA(m: GainNode) {
  // Two-blast foghorn.
  horn(m, 110, 1.2, 0, 0.5);
  horn(m, 110, 0.8, 1.5, 0.45);
}
function timeoutB(m: GainNode) {
  // Single long droop + low rumble.
  horn(m, 130, 1.8, 0, 0.5);
  noise(m, 1.5, 0.2, 0.08, { type: 'lowpass', freq: 300 });
  horn(m, 98, 0.9, 2.0, 0.45);
}
function timeoutC(m: GainNode) {
  // Hourglass trickle — granular highpass noise + low sustained tone.
  noise(m, 1.6, 0, 0.1, { type: 'highpass', freq: 3500 });
  tone(m, 130, 1.8, 0, 'sine', 0.35);
  bell(m, 520, 1.4, 0.25);
}
export function playTimeout() {
  const c = ensureCtx();
  if (!c) return;
  choose([timeoutA, timeoutB, timeoutC])(c.m);
}

/** Ship's bell tink (small bell). Pitch lowers when urgent. */
export function playTick(urgent = false) {
  const c = ensureCtx();
  if (!c) return;
  bell(c.m, urgent ? 1400 : 2000, 0, urgent ? 0.22 : 0.14);
}

/** Wave swoosh — filtered noise, 220ms. */
export function playPageWhoosh() {
  const c = ensureCtx();
  if (!c) return;
  noise(c.m, 0.22, 0, 0.15, { type: 'bandpass', freq: 1200, Q: 1 });
  sweep(c.m, 2400, 400, 0.22, 0, 'sine', 0.06);
}

/** Sonar ping — sine with shimmer tail. */
export function playSonarPing() {
  const c = ensureCtx();
  if (!c) return;
  tone(c.m, 1100, 0.35, 0, 'sine', 0.22);
  // shimmering overtone
  tone(c.m, 1650, 0.45, 0.02, 'sine', 0.08);
}

/** Seagull cry — U-shaped glide with random pitch + shape. */
export function playSeagull() {
  const c = ensureCtx();
  if (!c) return;
  const variants = [
    { low: 700, high: 1200, up: 1500, dur: 0.32, peak: 0.12 },
    { low: 600, high: 1100, up: 1350, dur: 0.38, peak: 0.1 },
    { low: 800, high: 1300, up: 1700, dur: 0.28, peak: 0.13 },
    { low: 750, high: 1250, up: 1250, dur: 0.42, peak: 0.11 }, // rising only
  ];
  const v = choose(variants);
  const osc = c.c.createOscillator();
  const g = c.c.createGain();
  osc.type = 'triangle';
  const t0 = c.c.currentTime;
  osc.frequency.setValueAtTime(v.high, t0);
  osc.frequency.linearRampToValueAtTime(v.low, t0 + v.dur * 0.45);
  osc.frequency.linearRampToValueAtTime(v.up, t0 + v.dur);
  envelope(g, t0, v.dur, { attack: 0.02, release: 0.12, peak: v.peak });
  osc.connect(g).connect(c.m);
  osc.start(t0);
  osc.stop(t0 + v.dur + 0.05);
}

/** Water splash — three slightly different profiles. */
export function playSplash() {
  const c = ensureCtx();
  if (!c) return;
  const variants: Array<(m: GainNode) => void> = [
    (m) => {
      noise(m, 0.5, 0, 0.25, { type: 'lowpass', freq: 800 });
      noise(m, 0.35, 0.02, 0.15, { type: 'highpass', freq: 4000 });
    },
    (m) => {
      // Heavier plunk — deeper lowpass + short thump.
      noise(m, 0.6, 0, 0.22, { type: 'lowpass', freq: 500 });
      tone(m, 140, 0.12, 0, 'sine', 0.3);
      noise(m, 0.3, 0.05, 0.12, { type: 'highpass', freq: 5500 });
    },
    (m) => {
      // Light spray — highpass-heavy.
      noise(m, 0.4, 0, 0.18, { type: 'highpass', freq: 3000 });
      noise(m, 0.25, 0.08, 0.1, { type: 'bandpass', freq: 2000, Q: 1.5 });
    },
  ];
  choose(variants)(c.m);
}

// ──────────────────────────────────────────────────────────────
// Route transition voices — one per named transition
// ──────────────────────────────────────────────────────────────

/** "Set sail" — short ship-horn blast paired with a bell. */
export function playSetSailHorn() {
  const c = ensureCtx();
  if (!c) return;
  horn(c.m, 180, 0.45, 0, 0.32);
  horn(c.m, 240, 0.45, 0.15, 0.32);
  bell(c.m, 1000, 0.4, 0.32);
}

/** "Porthole open" — glassy chime + soft swell. */
export function playPortholeChime() {
  const c = ensureCtx();
  if (!c) return;
  bell(c.m, 1400, 0, 0.35);
  bell(c.m, 1800, 0.06, 0.28);
  bell(c.m, 2400, 0.14, 0.22);
  sweep(c.m, 400, 2400, 0.3, 0, 'sine', 0.04);
}

/** "Spotlight" — bright lead-in bell just before the correct fanfare. */
export function playSpotlightBell() {
  const c = ensureCtx();
  if (!c) return;
  bell(c.m, 2100, 0, 0.45);
  bell(c.m, 1400, 0.08, 0.32);
  noise(c.m, 0.3, 0, 0.08, { type: 'highpass', freq: 6000 });
}

/** "Wave crash" — low thud + filtered noise surge. */
export function playWaveCrash() {
  const c = ensureCtx();
  if (!c) return;
  tone(c.m, 80, 0.25, 0, 'sine', 0.35);
  noise(c.m, 0.55, 0, 0.22, { type: 'lowpass', freq: 600 });
  noise(c.m, 0.4, 0.08, 0.14, { type: 'bandpass', freq: 900, Q: 1.5 });
}

/** "Tide recede" — gentle filtered swoosh dropping in pitch. */
export function playTideRecede() {
  const c = ensureCtx();
  if (!c) return;
  noise(c.m, 0.5, 0, 0.14, { type: 'lowpass', freq: 900 });
  sweep(c.m, 900, 220, 0.5, 0, 'sine', 0.06);
}

/** Thunder — deep rumble + sparse crack, for storm moments. */
export function playThunder() {
  const c = ensureCtx();
  if (!c) return;
  // Low rumble
  noise(c.m, 2.4, 0, 0.22, { type: 'lowpass', freq: 180 });
  tone(c.m, 55, 2.2, 0, 'sine', 0.28);
  // Quick crack transient
  noise(c.m, 0.12, 0.1, 0.3, { type: 'bandpass', freq: 1400, Q: 1.2 });
}

// ──────────────────────────────────────────────────────────────
// Ambient ocean drone — low-gain looping atmosphere
// ──────────────────────────────────────────────────────────────

let ambienceNodes: {
  noiseSrc: AudioBufferSourceNode;
  lp: BiquadFilterNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
  sub: OscillatorNode;
  subGain: GainNode;
  masterGain: GainNode;
} | null = null;

/** Start a low, slow ocean-ambience drone. Safe to call repeatedly. */
export function startOceanAmbience() {
  const c = ensureCtx();
  if (!c) return;
  if (ambienceNodes) return; // already running

  // 4-second looping pink-ish noise buffer
  const seconds = 4;
  const bufSize = c.c.sampleRate * seconds;
  const buf = c.c.createBuffer(1, bufSize, c.c.sampleRate);
  const data = buf.getChannelData(0);
  let b0 = 0,
    b1 = 0,
    b2 = 0;
  for (let i = 0; i < bufSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99 * b0 + 0.0555179 * white;
    b1 = 0.96 * b1 + 0.2965164 * white;
    b2 = 0.7 * b2 + 1.0526913 * white;
    data[i] = (b0 + b1 + b2) * 0.1;
  }
  const src = c.c.createBufferSource();
  src.buffer = buf;
  src.loop = true;

  const lp = c.c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 300;
  lp.Q.value = 0.7;

  // LFO sweeping cutoff 200 ↔ 500 Hz over ~16 s
  const lfo = c.c.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 1 / 16;
  const lfoGain = c.c.createGain();
  lfoGain.gain.value = 150;
  lfo.connect(lfoGain).connect(lp.frequency);

  // 40 Hz sub-sine pulse for weight
  const sub = c.c.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = 40;
  const subGain = c.c.createGain();
  subGain.gain.value = 0;

  const masterGain = c.c.createGain();
  masterGain.gain.value = 0;

  src.connect(lp).connect(masterGain);
  sub.connect(subGain).connect(masterGain);
  masterGain.connect(c.m);

  const now = c.c.currentTime;
  // Slow fade-in to cap of 0.08
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(0.08, now + 1.5);
  subGain.gain.setValueAtTime(0, now);
  subGain.gain.linearRampToValueAtTime(0.22, now + 2);

  src.start(now);
  lfo.start(now);
  sub.start(now);

  ambienceNodes = { noiseSrc: src, lp, lfo, lfoGain, sub, subGain, masterGain };
}

/** Stop the ambient drone with a short fade-out. */
export function stopOceanAmbience() {
  const c = ensureCtx();
  if (!c || !ambienceNodes) return;
  const { noiseSrc, lfo, sub, masterGain, subGain } = ambienceNodes;
  // Clear the handle first so a rapid start-stop-start sequence (e.g. quick
  // navigation out and back to /question) can build a fresh graph while
  // this one fades out in the background.
  ambienceNodes = null;
  const now = c.c.currentTime;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setValueAtTime(masterGain.gain.value, now);
  masterGain.gain.linearRampToValueAtTime(0, now + 0.8);
  subGain.gain.cancelScheduledValues(now);
  subGain.gain.linearRampToValueAtTime(0, now + 0.8);
  try {
    noiseSrc.stop(now + 0.9);
    lfo.stop(now + 0.9);
    sub.stop(now + 0.9);
  } catch {
    /* already stopped */
  }
}
