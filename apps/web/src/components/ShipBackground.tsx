'use client';

import { useMemo, type FC } from 'react';
import {
  Anchor,
  Buoy,
  ContainerShip,
  CruiseLiner,
  Iceberg,
  Lighthouse,
  PortCrane,
  Sailboat,
  Schooner,
  Seagull,
  Submarine,
  Tanker,
  Trawler,
  Whale,
} from './Ships';

type Variant =
  | 'reveal'
  | 'question'
  | 'result-correct'
  | 'result-wrong'
  | 'timeout'
  | 'default';

const NUM_VARIANTS: Record<Variant, number> = {
  reveal: 3,
  question: 5,
  'result-correct': 3,
  'result-wrong': 4,
  timeout: 3,
  default: 2,
};

/**
 * Full-bleed decorative background. Pure SVG + CSS keyframes — no JS ticker.
 * If `flavor` is provided, renders that exact sub-scene; otherwise picks
 * random on mount. Respects prefers-reduced-motion (freezes animations).
 */
export const ShipBackground: FC<{ variant?: Variant; flavor?: number }> = ({
  variant = 'default',
  flavor: flavorProp,
}) => {
  const randomFlavor = useMemo(
    () => Math.floor(Math.random() * NUM_VARIANTS[variant]),
    [variant],
  );
  const flavor =
    flavorProp != null && flavorProp < NUM_VARIANTS[variant]
      ? flavorProp
      : randomFlavor;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-90 [@media(prefers-reduced-motion:reduce)]:[&_*]:!animate-none"
    >
      <SkyAndSea variant={variant} />
      {renderScene(variant, flavor)}
      <SharedAnimations />
    </div>
  );
};

function renderScene(variant: Variant, flavor: number) {
  switch (variant) {
    case 'reveal':
      return [<RevealA key="a" />, <RevealB key="b" />, <RevealC key="c" />][flavor];
    case 'question':
      return [
        <QuestionA key="a" />,
        <QuestionB key="b" />,
        <QuestionC key="c" />,
        <QuestionD key="d" />,
        <QuestionE key="e" />,
      ][flavor];
    case 'result-correct':
      return [
        <CorrectA key="a" />,
        <CorrectB key="b" />,
        <CorrectC key="c" />,
      ][flavor];
    case 'result-wrong':
      return [
        <SunkenCompass key="a" />,
        <BrokenAnchorMemorial key="b" />,
        <CryingMoon key="c" />,
        <RoughSeas key="d" />,
      ][flavor];
    case 'timeout':
      return [
        <HourglassDrowned key="a" />,
        <MessageInBottle key="b" />,
        <LighthouseGoneDark key="c" />,
      ][flavor];
    default:
      return [<DefaultA key="a" />, <DefaultB key="b" />][flavor];
  }
}

// ──────────────────────────────────────────────────────────────
// Shared sky + sea, tinted per variant
// ──────────────────────────────────────────────────────────────

const SkyAndSea: FC<{ variant: Variant }> = ({ variant }) => {
  const tint = {
    reveal: { top: '#0A1F3A', mid: '#0B2540', horizon: '#1E3A68' },
    question: { top: '#0B2540', mid: '#13406B', horizon: '#2FB6C6' },
    'result-correct': { top: '#2A1B3E', mid: '#4A2040', horizon: '#C59D5F' }, // sunset
    'result-wrong': { top: '#1A0F28', mid: '#221428', horizon: '#3E1F35' }, // deep violet / charcoal
    timeout: { top: '#201810', mid: '#2E2418', horizon: '#4A3A22' }, // sepia / amber
    default: { top: '#0A1F3A', mid: '#0B2540', horizon: '#1A3A60' },
  }[variant];

  return (
    <svg
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id="od-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tint.top} />
          <stop offset="60%" stopColor={tint.mid} />
          <stop offset="100%" stopColor={tint.horizon} />
        </linearGradient>
        <linearGradient id="od-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#13406B" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#0A223D" />
        </linearGradient>
        <radialGradient id="od-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F4EADC" stopOpacity="0.85" />
          <stop offset="70%" stopColor="#F4EADC" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#F4EADC" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#od-sky)" />
      {/* horizon disc: moon or sun depending on variant */}
      {variant === 'result-correct' ? (
        <>
          <circle cx="1080" cy="430" r="180" fill="url(#od-sun)" />
          <circle cx="1080" cy="430" r="60" fill="#F4B061" opacity="0.85" />
        </>
      ) : variant === 'result-wrong' ? null : (
        <>
          <circle cx="1140" cy="180" r="120" fill="url(#od-sun)" />
          <circle cx="1140" cy="180" r="28" fill="#F4EADC" opacity="0.6" />
        </>
      )}
      {/* sea */}
      <rect x="0" y="560" width="1440" height="340" fill="url(#od-water)" />
      {Array.from({ length: 6 }).map((_, i) => (
        <path
          key={i}
          d={`M0 ${590 + i * 45} Q360 ${580 + i * 45} 720 ${590 + i * 45} T1440 ${590 + i * 45}`}
          stroke="#2FB6C6"
          strokeOpacity={0.08 + i * 0.025}
          strokeWidth="1.2"
          fill="none"
        />
      ))}
    </svg>
  );
};

// ──────────────────────────────────────────────────────────────
// Reveal variants
// ──────────────────────────────────────────────────────────────

const RevealA: FC = () => (
  // Compass rose + tall ship under stars
  <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
    <g transform="translate(400 420)" opacity="0.18">
      <circle r="260" fill="none" stroke="#C59D5F" strokeWidth="1.5" />
      <circle r="200" fill="none" stroke="#C59D5F" strokeWidth="0.8" />
      <g style={{ animation: 'od-compass-spin 60s linear infinite', transformOrigin: 'center' }}>
        <path d="M0 -250 L18 0 L0 250 L-18 0 Z" fill="#C59D5F" />
        <path d="M-250 0 L0 -14 L250 0 L0 14 Z" fill="#C59D5F" opacity="0.7" />
      </g>
    </g>
    {Stars(35)}
    <g
      transform="translate(880 540) scale(0.9)"
      style={{ animation: 'od-ship-rock 8s ease-in-out infinite', transformOrigin: '200px 140px' }}
    >
      <Schooner />
    </g>
  </svg>
);

const RevealB: FC = () => (
  // Lighthouse at night + sweeping beam + distant trawler
  <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
    <defs>
      <linearGradient id="beam-r" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#F4EADC" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#F4EADC" stopOpacity="0" />
      </linearGradient>
    </defs>
    {Stars(30)}
    <g
      transform="translate(1130 430)"
      style={{ transformOrigin: '70px 25px', animation: 'od-beam-sweep 8s ease-in-out infinite' }}
    >
      <polygon points="70,25 -900,-150 -900,180" fill="url(#beam-r)" />
    </g>
    <g transform="translate(1100 420) scale(1.1)">
      <Lighthouse />
    </g>
    <g
      transform="translate(200 530)"
      style={{ animation: 'od-drift 50s linear infinite' }}
    >
      <Trawler />
    </g>
    <g transform="translate(700 680) scale(0.5)" opacity="0.6">
      <Buoy />
    </g>
  </svg>
);

const RevealC: FC = () => (
  // Submarine surfacing with stars
  <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
    {Stars(40)}
    <g transform="translate(520 560)" style={{ animation: 'od-sub-bob 7s ease-in-out infinite' }}>
      <Submarine />
    </g>
    {/* sonar rings */}
    {[0, 1, 2].map((i) => (
      <circle
        key={i}
        cx="720"
        cy="620"
        r="20"
        fill="none"
        stroke="#2FB6C6"
        strokeOpacity="0.35"
        style={{ animation: `od-sonar 4s ease-out ${i * 1.3}s infinite` }}
      />
    ))}
  </svg>
);

// ──────────────────────────────────────────────────────────────
// Question variants — a different working ship per flavor
// ──────────────────────────────────────────────────────────────

const QuestionA: FC = () => (
  // Container ship mid-ocean with bubbles
  <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
    <g
      transform="translate(520 500)"
      style={{ transformOrigin: '180px 80px', animation: 'od-ship-rock 6s ease-in-out infinite' }}
    >
      <ContainerShip />
    </g>
    {Bubbles(8)}
    {SeagullFlock(3, 150)}
  </svg>
);

const QuestionB: FC = () => (
  // Cruise liner with port crane backdrop
  <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
    <g transform="translate(80 550)" opacity="0.7">
      <PortCrane />
    </g>
    <g transform="translate(1180 550)" opacity="0.7">
      <PortCrane />
    </g>
    <g
      transform="translate(480 490)"
      style={{ transformOrigin: '190px 90px', animation: 'od-ship-rock 7s ease-in-out infinite' }}
    >
      <CruiseLiner />
    </g>
    {SeagullFlock(5, 180)}
  </svg>
);

const QuestionC: FC = () => (
  // Oil tanker + distant sailboat (multi-ship)
  <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
    <g
      transform="translate(440 510)"
      style={{ transformOrigin: '180px 100px', animation: 'od-ship-rock 6s ease-in-out infinite' }}
    >
      <Tanker />
    </g>
    <g
      transform="translate(1080 580) scale(0.55)"
      style={{ animation: 'od-drift-slow 70s linear infinite' }}
    >
      <Sailboat />
    </g>
    {Bubbles(6)}
  </svg>
);

const QuestionD: FC = () => (
  // Sailboat alone on a calm sea + whale below horizon
  <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
    <g
      transform="translate(560 440)"
      style={{ transformOrigin: '160px 100px', animation: 'od-ship-rock 5s ease-in-out infinite' }}
    >
      <Sailboat />
    </g>
    <g
      transform="translate(140 720)"
      style={{ animation: 'od-whale-breach 14s ease-in-out infinite' }}
    >
      <Whale />
    </g>
    {SeagullFlock(4, 220)}
  </svg>
);

const QuestionE: FC = () => (
  // Fishing regatta — trawler + schooner drifting
  <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
    <g transform="translate(100 570)" style={{ animation: 'od-drift 45s linear infinite' }}>
      <Trawler />
    </g>
    <g transform="translate(780 490) scale(0.85)" style={{ animation: 'od-ship-rock 6s ease-in-out infinite', transformOrigin: '200px 140px' }}>
      <Schooner />
    </g>
    <g transform="translate(1280 640) scale(0.5)" opacity="0.8">
      <Buoy />
    </g>
  </svg>
);

// ──────────────────────────────────────────────────────────────
// Result-correct variants — celebratory, lit, calm
// ──────────────────────────────────────────────────────────────

const CorrectA: FC = () => (
  // Harbor sunset with returning ship + lighthouse + gulls
  <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
    <g transform="translate(1160 430) scale(0.95)">
      <Lighthouse />
    </g>
    <g
      transform="translate(360 500)"
      style={{ animation: 'od-drift-home 30s ease-out forwards' }}
    >
      <CruiseLiner />
    </g>
    {SeagullFlock(7, 200)}
    {/* sunlight reflections on water */}
    {Array.from({ length: 7 }).map((_, i) => (
      <ellipse
        key={i}
        cx={1060 + (i - 3) * 40}
        cy={640 + i * 12}
        rx="40"
        ry="2"
        fill="#F4B061"
        opacity="0.35"
      />
    ))}
  </svg>
);

const CorrectB: FC = () => (
  // Victory — schooner with full sails under dawn sky + dolphins
  <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
    <g
      transform="translate(520 430)"
      style={{ transformOrigin: '200px 140px', animation: 'od-ship-rock 5s ease-in-out infinite' }}
    >
      <Schooner />
    </g>
    {SeagullFlock(8, 220)}
    {/* dolphin leap */}
    <g transform="translate(1020 720)" style={{ animation: 'od-dolphin 6s ease-in-out infinite' }}>
      <path
        d="M0 0 Q 20 -40 60 -30 Q 100 -20 130 20"
        fill="none"
        stroke="#F4EADC"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </g>
    {/* fireworks sparks */}
    {Array.from({ length: 12 }).map((_, i) => {
      const x = 700 + (i % 4) * 40;
      const y = 150 + Math.floor(i / 4) * 30;
      return (
        <circle
          key={i}
          cx={x}
          cy={y}
          r="2"
          fill="#C59D5F"
          style={{ animation: `od-twinkle ${1.5 + (i % 3)}s ease-in-out ${i * 0.1}s infinite` }}
        />
      );
    })}
  </svg>
);

const CorrectC: FC = () => (
  // Fleet returning — multiple ships in line
  <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
    <g transform="translate(100 570) scale(0.7)" style={{ animation: 'od-drift 40s linear infinite' }}>
      <Trawler />
    </g>
    <g transform="translate(460 530) scale(0.85)" style={{ animation: 'od-drift 36s linear infinite' }}>
      <Tanker />
    </g>
    <g transform="translate(880 490)" style={{ animation: 'od-drift 32s linear infinite' }}>
      <ContainerShip />
    </g>
    {SeagullFlock(6, 180)}
  </svg>
);

// ──────────────────────────────────────────────────────────────
// Result-wrong variants — symbolic, abstract (no ship-in-storm cliché)
// ──────────────────────────────────────────────────────────────

const SunkenCompass: FC = () => (
  // Brass compass descending into dark water, needle spinning aimlessly.
  <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
    {/* dark water overlay */}
    <rect x="0" y="0" width="1440" height="900" fill="#0B0814" opacity="0.55" />
    {/* faint downward shaft of light */}
    <defs>
      <linearGradient id="od-shaft" x1="0.5" y1="0" x2="0.5" y2="1">
        <stop offset="0%" stopColor="#C59D5F" stopOpacity="0.22" />
        <stop offset="100%" stopColor="#C59D5F" stopOpacity="0" />
      </linearGradient>
    </defs>
    <polygon points="620,0 820,0 900,900 540,900" fill="url(#od-shaft)" />
    {/* rising silt */}
    {Array.from({ length: 14 }).map((_, i) => (
      <circle
        key={`silt-${i}`}
        cx={400 + ((i * 80) % 640)}
        cy={900}
        r={1.4 + (i % 3) * 0.6}
        fill="#C59D5F"
        fillOpacity="0.28"
        style={{
          animation: `od-silt-rise ${12 + (i % 5) * 2}s linear ${i * 0.7}s infinite`,
        }}
      />
    ))}
    {/* compass, descending slowly */}
    <g
      transform="translate(720 380)"
      style={{
        transformBox: 'fill-box',
        transformOrigin: 'center',
        animation: 'od-sink-slow 16s ease-in-out infinite',
      }}
    >
      {/* outer brass ring */}
      <circle r="130" fill="none" stroke="#C59D5F" strokeWidth="6" opacity="0.85" />
      <circle r="112" fill="#1A0F0A" opacity="0.8" />
      {/* cardinal ticks */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line
          key={deg}
          x1="0"
          y1="-112"
          x2="0"
          y2="-96"
          stroke="#C59D5F"
          strokeWidth={deg % 90 === 0 ? 3 : 1.5}
          transform={`rotate(${deg})`}
          opacity="0.7"
        />
      ))}
      {/* wild spinning needle */}
      <g style={{ animation: 'od-needle-spin-wild 2.6s ease-in-out infinite' }}>
        <path d="M0 -96 L10 0 L0 96 L-10 0 Z" fill="#D04747" opacity="0.85" />
        <path d="M-96 0 L0 -8 L96 0 L0 8 Z" fill="#C59D5F" opacity="0.65" />
        <circle r="8" fill="#C59D5F" />
      </g>
      {/* muted red error ring pulses */}
      {[0, 1, 2].map((i) => (
        <circle
          key={`err-${i}`}
          r="130"
          fill="none"
          stroke="#D04747"
          strokeOpacity="0.35"
          strokeWidth="2"
          style={{ animation: `od-sonar 5s ease-out ${i * 1.6}s infinite` }}
        />
      ))}
    </g>
  </svg>
);

const BrokenAnchorMemorial: FC = () => (
  // Cracked anchor silhouette on foggy shore.
  <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
    {/* dim ground + fog overlay */}
    <rect x="0" y="720" width="1440" height="180" fill="#0B0812" opacity="0.7" />
    {Array.from({ length: 5 }).map((_, i) => (
      <rect
        key={`fog-${i}`}
        x="0"
        y={380 + i * 70}
        width="1440"
        height="60"
        fill="#D8CFB8"
        opacity={0.06 + i * 0.02}
        style={{ animation: `od-drift ${50 + i * 6}s linear ${i * 2}s infinite` }}
      />
    ))}
    {/* cracked anchor — enlarged, grayed */}
    <g
      transform="translate(720 460)"
      style={{
        transformBox: 'fill-box',
        transformOrigin: 'center',
        filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.7))',
      }}
    >
      {/* Anchor shaft */}
      <rect x="-12" y="-220" width="24" height="360" fill="#5C5047" />
      {/* Ring at top */}
      <circle cx="0" cy="-230" r="26" fill="none" stroke="#5C5047" strokeWidth="10" />
      {/* Cross-bar */}
      <rect x="-90" y="-160" width="180" height="16" fill="#5C5047" />
      {/* Arms & flukes */}
      <path
        d="M-12 140 Q-180 130 -170 40 L-135 40 Q-140 100 -30 120 Z"
        fill="#5C5047"
      />
      <path
        d="M12 140 Q180 130 170 40 L135 40 Q140 100 30 120 Z"
        fill="#5C5047"
      />
      {/* Crack — bright highlight, keeps color muted */}
      <path
        d="M-2 -220 L6 -120 L-4 -30 L10 80 L-2 140"
        stroke="#C59D5F"
        strokeWidth="2.5"
        fill="none"
        opacity="0.75"
      />
      <path
        d="M-2 -220 L6 -120 L-4 -30 L10 80 L-2 140"
        stroke="#E8BFA0"
        strokeWidth="0.8"
        fill="none"
        opacity="0.9"
      />
    </g>
    {/* rain streaks — light, gray */}
    {Array.from({ length: 36 }).map((_, i) => (
      <line
        key={`r-${i}`}
        x1={(i * 41) % 1440}
        y1="0"
        x2={((i * 41) % 1440) - 16}
        y2="80"
        stroke="#D8CFB8"
        strokeOpacity="0.16"
        strokeWidth="1"
        style={{
          animation: `od-rain ${0.9 + (i % 3) * 0.2}s linear ${(i % 5) * 0.1}s infinite`,
        }}
      />
    ))}
  </svg>
);

const CryingMoon: FC = () => (
  // Oversized moon with a single tear; three distant lights blinking out.
  <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
    <defs>
      <radialGradient id="od-moon" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#F4EADC" stopOpacity="1" />
        <stop offset="70%" stopColor="#E6DCC8" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#E6DCC8" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="od-moon-reflect" x1="0.5" y1="0" x2="0.5" y2="1">
        <stop offset="0%" stopColor="#F4EADC" stopOpacity="0.45" />
        <stop offset="100%" stopColor="#F4EADC" stopOpacity="0" />
      </linearGradient>
    </defs>
    {Stars(24)}
    {/* moon halo + disc */}
    <circle cx="720" cy="330" r="240" fill="url(#od-moon)" />
    <circle cx="720" cy="330" r="130" fill="#F4EADC" opacity="0.92" />
    {/* subtle crater shading */}
    <circle cx="686" cy="308" r="12" fill="#C9BFA8" opacity="0.5" />
    <circle cx="748" cy="340" r="18" fill="#C9BFA8" opacity="0.4" />
    <circle cx="710" cy="360" r="7" fill="#C9BFA8" opacity="0.45" />
    {/* tear drop — falls then regenerates */}
    <g
      transform="translate(720 450)"
      style={{ animation: 'od-tear-fall 4.5s ease-in 0s infinite' }}
    >
      <path
        d="M0 0 C -8 8 -8 18 0 24 C 8 18 8 8 0 0 Z"
        fill="#7DC8E8"
        opacity="0.95"
      />
    </g>
    {/* long reflective slash on water */}
    <rect x="680" y="620" width="80" height="280" fill="url(#od-moon-reflect)" />
    {/* three distant lights blinking out */}
    {[300, 1100, 210].map((x, i) => (
      <circle
        key={`light-${i}`}
        cx={x}
        cy={640 + i * 14}
        r="3"
        fill="#F4B061"
        style={{
          animation: `od-light-die 9s ease-in-out ${i * 2.2}s infinite`,
        }}
      />
    ))}
  </svg>
);

const RoughSeas: FC = () => (
  // Concrete, energetic storm scene: heaving sea, tossing ship, driving rain,
  // lightning behind thick clouds. No abstract symbolism — reads instantly.
  <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
    <defs>
      <linearGradient id="od-rs-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0A0618" />
        <stop offset="55%" stopColor="#1A1028" />
        <stop offset="100%" stopColor="#2A1838" />
      </linearGradient>
      <linearGradient id="od-rs-wave" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1E1630" />
        <stop offset="100%" stopColor="#0A0412" />
      </linearGradient>
      <linearGradient id="od-rs-foam" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#D8CFB8" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#D8CFB8" stopOpacity="0" />
      </linearGradient>
      <radialGradient id="od-rs-flash" cx="50%" cy="30%" r="60%">
        <stop offset="0%" stopColor="#F4EADC" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#F4EADC" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="1440" height="900" fill="url(#od-rs-sky)" />

    {/* lightning flash — full-viewport strobe every few seconds */}
    <rect
      width="1440"
      height="900"
      fill="url(#od-rs-flash)"
      style={{ animation: 'od-rs-flash 6s ease-in-out infinite' }}
    />
    {/* lightning bolt */}
    <polyline
      points="920,80 900,180 935,200 880,340 920,360 860,520"
      fill="none"
      stroke="#F4EADC"
      strokeWidth="3"
      strokeOpacity="0.95"
      style={{ animation: 'od-rs-bolt 6s linear infinite' }}
    />

    {/* stacked storm clouds — driven left */}
    {Array.from({ length: 6 }).map((_, i) => (
      <g
        key={`cloud-${i}`}
        style={{ animation: `od-rs-cloud ${28 + i * 4}s linear ${i * 3}s infinite` }}
      >
        <ellipse
          cx={240 + i * 220}
          cy={110 + (i % 2) * 30}
          rx={160 + (i % 3) * 40}
          ry={36}
          fill="#130A22"
          opacity="0.9"
        />
        <ellipse
          cx={200 + i * 220}
          cy={96 + (i % 2) * 30}
          rx={80}
          ry={28}
          fill="#1A1028"
          opacity="0.88"
        />
        <ellipse
          cx={290 + i * 220}
          cy={98 + (i % 2) * 30}
          rx={90}
          ry={30}
          fill="#1A1028"
          opacity="0.85"
        />
      </g>
    ))}

    {/* Three wave layers, back → mid → front, each slightly different speed */}
    <g style={{ animation: 'od-rs-wave-back 9s ease-in-out infinite' }}>
      <path
        d="M-40 560 Q180 500 360 560 T720 560 T1080 560 T1480 560 L1480 900 L-40 900 Z"
        fill="url(#od-rs-wave)"
        opacity="0.85"
      />
      <path
        d="M-40 560 Q180 500 360 560 T720 560 T1080 560 T1480 560"
        fill="none"
        stroke="url(#od-rs-foam)"
        strokeWidth="3"
      />
    </g>
    <g style={{ animation: 'od-rs-wave-mid 6s ease-in-out infinite' }}>
      <path
        d="M-60 650 Q160 580 340 650 T700 650 T1060 650 T1480 650 L1480 900 L-60 900 Z"
        fill="url(#od-rs-wave)"
        opacity="0.92"
      />
      <path
        d="M-60 650 Q160 580 340 650 T700 650 T1060 650 T1480 650"
        fill="none"
        stroke="url(#od-rs-foam)"
        strokeWidth="4"
      />
    </g>

    {/* Ship — tossed center, pitches back and forth */}
    <g
      transform="translate(720 620)"
      style={{
        transformBox: 'fill-box',
        transformOrigin: '50% 70%',
        animation: 'od-rs-ship 4s ease-in-out infinite',
      }}
    >
      {/* hull */}
      <path
        d="M-160 0 L160 0 L130 46 L-130 46 Z"
        fill="#0B0812"
        stroke="#C59D5F"
        strokeWidth="2"
      />
      {/* deckhouse */}
      <rect x="-40" y="-34" width="80" height="34" fill="#1A1028" stroke="#C59D5F" strokeWidth="1.5" />
      {/* mast */}
      <rect x="-2" y="-100" width="4" height="68" fill="#C59D5F" />
      {/* funnel */}
      <rect x="44" y="-30" width="20" height="30" fill="#1A1028" stroke="#C59D5F" strokeWidth="1.2" />
      <rect x="44" y="-34" width="20" height="6" fill="#D04747" />
      {/* tiny porthole */}
      <circle cx="-60" cy="20" r="4" fill="#F4B061" opacity="0.8" />
      <circle cx="60" cy="20" r="4" fill="#F4B061" opacity="0.8" />
      {/* spray at the bow */}
      <ellipse cx="-180" cy="6" rx="36" ry="10" fill="#D8CFB8" opacity="0.5" />
      <ellipse cx="180" cy="6" rx="36" ry="10" fill="#D8CFB8" opacity="0.5" />
    </g>

    {/* Front wave — drawn ON TOP of ship bottom so the ship "dips into" it */}
    <g style={{ animation: 'od-rs-wave-front 4.5s ease-in-out infinite' }}>
      <path
        d="M-80 740 Q120 660 320 740 T680 740 T1040 740 T1480 740 L1480 900 L-80 900 Z"
        fill="url(#od-rs-wave)"
      />
      <path
        d="M-80 740 Q120 660 320 740 T680 740 T1040 740 T1480 740"
        fill="none"
        stroke="url(#od-rs-foam)"
        strokeWidth="5"
      />
    </g>

    {/* driving rain */}
    {Array.from({ length: 60 }).map((_, i) => (
      <line
        key={`rn-${i}`}
        x1={(i * 53) % 1440}
        y1="-20"
        x2={((i * 53) % 1440) - 28}
        y2="120"
        stroke="#7DC8E8"
        strokeOpacity="0.26"
        strokeWidth="1.2"
        style={{
          animation: `od-rs-rain ${0.55 + (i % 4) * 0.15}s linear ${(i % 7) * 0.08}s infinite`,
        }}
      />
    ))}
  </svg>
);

// ──────────────────────────────────────────────────────────────
// Timeout variants — symbolic, abstract (no ship required)
// ──────────────────────────────────────────────────────────────

const HourglassDrowned: FC = () => (
  // Stylized hourglass submerged; grains drift up as bubbles.
  <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
    {/* water darkness overlay */}
    <rect x="0" y="0" width="1440" height="900" fill="#1A1208" opacity="0.5" />
    {/* dim amber light from above */}
    <defs>
      <radialGradient id="od-amber-shaft" cx="50%" cy="0%" r="60%">
        <stop offset="0%" stopColor="#F4B061" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#F4B061" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect x="0" y="0" width="1440" height="900" fill="url(#od-amber-shaft)" />
    {/* hourglass body */}
    <g
      transform="translate(720 450)"
      style={{
        transformBox: 'fill-box',
        transformOrigin: 'center',
        animation: 'od-silt-rise 18s ease-in-out infinite',
        animationDirection: 'alternate',
      }}
    >
      {/* top + bottom caps */}
      <rect x="-100" y="-210" width="200" height="14" fill="#C59D5F" />
      <rect x="-100" y="196" width="200" height="14" fill="#C59D5F" />
      {/* glass outline */}
      <path
        d="M-90 -196 L90 -196 L30 0 L90 196 L-90 196 L-30 0 Z"
        fill="#3A2818"
        fillOpacity="0.4"
        stroke="#C59D5F"
        strokeWidth="3"
      />
      {/* sand trapped (top half small mound, bottom half larger) */}
      <path
        d="M-60 -170 L60 -170 L18 -40 L-18 -40 Z"
        fill="#C59D5F"
        opacity="0.35"
      />
      <path
        d="M-74 196 L74 196 L40 60 L-40 60 Z"
        fill="#C59D5F"
        opacity="0.6"
      />
    </g>
    {/* grains drifting upward as bubbles */}
    {Array.from({ length: 10 }).map((_, i) => (
      <circle
        key={`grain-${i}`}
        cx={700 + ((i * 7) % 40)}
        cy={900}
        r={2 + (i % 3) * 0.5}
        fill="#C59D5F"
        fillOpacity="0.5"
        style={{ animation: `od-bubble-slow ${10 + (i % 4) * 2}s ease-in ${i * 0.9}s infinite` }}
      />
    ))}
    {/* quiet bubbles elsewhere */}
    {SlowBubbles(8)}
  </svg>
);

const MessageInBottle: FC = () => (
  // A sealed amber bottle drifting on abstract wave lines.
  <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
    {/* vignette — fades to black at edges */}
    <defs>
      <radialGradient id="od-vignette" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stopColor="#000" stopOpacity="0" />
        <stop offset="100%" stopColor="#000" stopOpacity="0.75" />
      </radialGradient>
    </defs>
    {/* minimalist wave lines */}
    {Array.from({ length: 10 }).map((_, i) => (
      <path
        key={`wave-${i}`}
        d={`M0 ${520 + i * 32} Q360 ${500 + i * 32} 720 ${520 + i * 32} T1440 ${520 + i * 32}`}
        stroke="#C59D5F"
        strokeOpacity={0.08 + i * 0.025}
        strokeWidth="1.2"
        fill="none"
      />
    ))}
    {/* bottle, drifting */}
    <g
      transform="translate(600 510)"
      style={{ animation: 'od-bottle-drift 10s ease-in-out infinite' }}
    >
      {/* body */}
      <rect x="0" y="-40" width="220" height="70" rx="12" fill="#C59D5F" opacity="0.75" />
      {/* shoulder */}
      <path d="M220 -40 Q260 -40 270 -18 L270 8 Q260 30 220 30 Z" fill="#C59D5F" opacity="0.75" />
      {/* neck */}
      <rect x="270" y="-10" width="36" height="14" fill="#C59D5F" opacity="0.9" />
      {/* cork */}
      <rect x="306" y="-12" width="18" height="18" fill="#8B6A3A" />
      {/* scroll inside */}
      <rect x="40" y="-22" width="110" height="30" fill="#F4EADC" opacity="0.85" />
      <line x1="54" y1="-14" x2="140" y2="-14" stroke="#8B6A3A" strokeWidth="1" opacity="0.8" />
      <line x1="54" y1="-6" x2="130" y2="-6" stroke="#8B6A3A" strokeWidth="1" opacity="0.8" />
      <line x1="54" y1="2" x2="120" y2="2" stroke="#8B6A3A" strokeWidth="1" opacity="0.8" />
      {/* highlight */}
      <rect x="16" y="-34" width="6" height="54" fill="#F4EADC" opacity="0.35" />
    </g>
    <rect x="0" y="0" width="1440" height="900" fill="url(#od-vignette)" />
  </svg>
);

const LighthouseGoneDark: FC = () => (
  // Familiar lighthouse silhouette, beam out, one final spark dying.
  <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
    {/* dim background darker than usual */}
    <rect x="0" y="0" width="1440" height="900" fill="#0A0804" opacity="0.55" />
    {Stars(18)}
    {/* lighthouse silhouette, dark */}
    <g transform="translate(680 380) scale(1.4)" opacity="0.85">
      {/* rock base */}
      <ellipse cx="70" cy="180" rx="120" ry="22" fill="#1C1208" />
      {/* tower */}
      <path
        d="M40 180 L40 40 L60 0 L80 0 L100 40 L100 180 Z"
        fill="#241810"
        stroke="#3A2A18"
        strokeWidth="1"
      />
      {/* stripes (muted) */}
      <rect x="40" y="60" width="60" height="14" fill="#3A2A18" opacity="0.7" />
      <rect x="40" y="110" width="60" height="14" fill="#3A2A18" opacity="0.7" />
      {/* cupola */}
      <rect x="34" y="-18" width="72" height="22" fill="#241810" />
      <polygon points="34,-18 70,-42 106,-18" fill="#241810" />
      {/* lamp — dark, not emitting */}
      <rect x="54" y="-14" width="32" height="18" fill="#1A1208" />
      {/* windows dark */}
      <rect x="56" y="60" width="12" height="16" fill="#000" opacity="0.9" />
      <rect x="72" y="110" width="12" height="16" fill="#000" opacity="0.9" />
    </g>
    {/* final spark flickering at lamp location, then dies */}
    <circle
      cx="778"
      cy="368"
      r="8"
      fill="#F4B061"
      style={{ animation: 'od-light-die 7s ease-in-out 0.5s infinite' }}
    />
    {/* faint cold water line */}
    <rect x="0" y="680" width="1440" height="220" fill="#1A1208" opacity="0.35" />
  </svg>
);

// ──────────────────────────────────────────────────────────────
// Default landing variants
// ──────────────────────────────────────────────────────────────

const DefaultA: FC = () => (
  <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
    {Stars(40)}
    <g transform="translate(1020 530) scale(0.8)" style={{ animation: 'od-drift-slow 60s linear infinite' }}>
      <ContainerShip />
    </g>
  </svg>
);

const DefaultB: FC = () => (
  <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
    {Stars(30)}
    <g transform="translate(900 450) scale(0.9)">
      <Lighthouse />
    </g>
  </svg>
);

// ──────────────────────────────────────────────────────────────
// Shared primitives (stars, bubbles, clouds, rain, gulls)
// ──────────────────────────────────────────────────────────────

function Stars(n: number) {
  return Array.from({ length: n }).map((_, i) => {
    const x = (i * 53) % 1440;
    const y = (i * 31) % 520;
    const d = (i % 5) * 0.4;
    return (
      <circle
        key={`star-${i}`}
        cx={x}
        cy={y}
        r={i % 3 === 0 ? 1.6 : 1}
        fill="#F4EADC"
        opacity="0.8"
        style={{ animation: `od-twinkle ${3 + (i % 4)}s ease-in-out ${d}s infinite` }}
      />
    );
  });
}

function Bubbles(n: number) {
  return Array.from({ length: n }).map((_, i) => (
    <circle
      key={`b-${i}`}
      cx={200 + i * 140}
      cy={900}
      r={3 + (i % 3)}
      fill="#2FB6C6"
      fillOpacity="0.28"
      style={{
        animation: `od-bubble ${8 + (i % 4)}s ease-in ${i * 0.6}s infinite`,
      }}
    />
  ));
}

function SlowBubbles(n: number) {
  return Array.from({ length: n }).map((_, i) => (
    <circle
      key={`sb-${i}`}
      cx={620 + ((i * 40) % 200)}
      cy="900"
      r={4 + (i % 3)}
      fill="#2FB6C6"
      fillOpacity="0.35"
      style={{
        animation: `od-bubble-slow ${6 + (i % 4)}s ease-in ${i * 0.25}s infinite`,
      }}
    />
  ));
}

function StormClouds(n: number) {
  const layouts = [
    { x: 200, y: 150, s: 1 },
    { x: 650, y: 100, s: 1.4 },
    { x: 1100, y: 170, s: 0.9 },
    { x: 400, y: 220, s: 0.8 },
  ].slice(0, n);
  return layouts.map((c, i) => (
    <g
      key={`c-${i}`}
      transform={`translate(${c.x} ${c.y}) scale(${c.s})`}
      style={{ animation: `od-drift ${25 + i * 4}s linear infinite` }}
    >
      <ellipse cx="0" cy="0" rx="120" ry="30" fill="#0A1F3A" opacity="0.85" />
      <ellipse cx="-50" cy="-10" rx="60" ry="25" fill="#0A1F3A" opacity="0.9" />
      <ellipse cx="50" cy="-12" rx="70" ry="28" fill="#0A1F3A" opacity="0.85" />
    </g>
  ));
}

function Rain(n: number) {
  return Array.from({ length: n }).map((_, i) => (
    <line
      key={`r-${i}`}
      x1={(i * 41) % 1440}
      y1="0"
      x2={((i * 41) % 1440) - 20}
      y2="100"
      stroke="#2FB6C6"
      strokeOpacity="0.22"
      strokeWidth="1"
      style={{
        animation: `od-rain ${0.6 + (i % 3) * 0.2}s linear ${(i % 5) * 0.1}s infinite`,
      }}
    />
  ));
}

function SeagullFlock(n: number, topY = 200) {
  return Array.from({ length: n }).map((_, i) => (
    <g
      key={`gull-${i}`}
      style={{
        animation: `od-gull ${12 + i * 2}s linear ${i * 2}s infinite`,
        transformBox: 'fill-box',
      }}
      transform={`translate(${-200 + i * 30} ${topY + i * 28})`}
    >
      <Seagull />
    </g>
  ));
}

// ──────────────────────────────────────────────────────────────
// Shared keyframes — one stylesheet used across all scenes
// ──────────────────────────────────────────────────────────────

const SharedAnimations: FC = () => (
  <style>{`
    @keyframes od-compass-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes od-ship-rock { 0%, 100% { transform: rotate(-1.3deg); } 50% { transform: rotate(1.3deg); } }
    @keyframes od-list { 0%, 100% { transform: rotate(-8deg); } 50% { transform: rotate(8deg); } }
    @keyframes od-sub-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
    @keyframes od-sonar { 0% { r: 20; stroke-opacity: 0.6; } 100% { r: 300; stroke-opacity: 0; } }
    @keyframes od-twinkle { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.9; } }
    @keyframes od-bubble { 0% { transform: translateY(0); opacity: 0; } 20% { opacity: 0.4; } 100% { transform: translateY(-800px); opacity: 0; } }
    @keyframes od-bubble-slow { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: 0.5; } 100% { transform: translateY(-900px); opacity: 0; } }
    @keyframes od-drift { 0% { transform: translateX(-10%); } 100% { transform: translateX(110vw); } }
    @keyframes od-drift-slow { 0% { transform: translateX(-5%); } 100% { transform: translateX(105vw); } }
    @keyframes od-drift-home { 0% { transform: translateX(-400px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
    @keyframes od-beam-sweep { 0%, 100% { transform: rotate(-22deg); } 50% { transform: rotate(10deg); } }
    @keyframes od-lightning { 0%, 88%, 92%, 100% { opacity: 0; } 90% { opacity: 0.45; } }
    @keyframes od-rain { 0% { transform: translateY(-100px); } 100% { transform: translateY(1000px); } }
    @keyframes od-sink {
      0% { transform: translate(0, 0) rotate(-5deg); }
      50% { transform: translate(0, 40px) rotate(-20deg); }
      100% { transform: translate(0, 100px) rotate(-55deg); }
    }
    @keyframes od-raft { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(10px, -6px); } }
    @keyframes od-whale-breach {
      0%, 100% { transform: translate(0, 20px); opacity: 0.2; }
      30%, 40% { transform: translate(60px, 0); opacity: 0.9; }
      70% { transform: translate(100px, 30px); opacity: 0.5; }
    }
    @keyframes od-dolphin { 0%, 100% { transform: translate(0, 0); opacity: 0; } 30%, 50% { transform: translate(40px, -30px); opacity: 0.85; } 80% { transform: translate(100px, 0); opacity: 0; } }
    @keyframes od-gull { 0% { transform: translateX(0); } 100% { transform: translateX(1700px); } }
    /* Sad-scene keyframes */
    @keyframes od-sink-slow {
      0%, 100% { transform: translateY(-30px); opacity: 0.9; }
      50% { transform: translateY(60px); opacity: 0.7; }
    }
    @keyframes od-needle-spin-wild {
      0% { transform: rotate(0deg); }
      30% { transform: rotate(420deg); }
      55% { transform: rotate(380deg); }
      75% { transform: rotate(720deg); }
      100% { transform: rotate(900deg); }
    }
    @keyframes od-tear-fall {
      0% { transform: translate(720px, 450px) scaleY(0.4); opacity: 0; }
      12% { transform: translate(720px, 450px) scaleY(1); opacity: 0.95; }
      70% { transform: translate(720px, 720px) scaleY(1); opacity: 0.85; }
      100% { transform: translate(720px, 810px) scaleY(0.6); opacity: 0; }
    }
    @keyframes od-light-die {
      0%, 100% { opacity: 0; }
      10%, 12% { opacity: 1; }
      13%, 18% { opacity: 0.2; }
      19%, 22% { opacity: 0.9; }
      23% { opacity: 0; }
    }
    @keyframes od-bottle-drift {
      0%, 100% { transform: translate(600px, 510px) rotate(-3deg); }
      50% { transform: translate(700px, 494px) rotate(4deg); }
    }
    @keyframes od-silt-rise {
      0% { transform: translateY(0); opacity: 0; }
      15% { opacity: 0.45; }
      100% { transform: translateY(-760px); opacity: 0; }
    }
    /* RoughSeas — vivid storm scene */
    @keyframes od-rs-flash {
      0%, 88%, 94%, 100% { opacity: 0; }
      90%, 92% { opacity: 0.8; }
    }
    @keyframes od-rs-bolt {
      0%, 89%, 93%, 100% { opacity: 0; }
      90%, 92% { opacity: 1; }
    }
    @keyframes od-rs-cloud {
      0% { transform: translateX(0); }
      100% { transform: translateX(-400px); }
    }
    @keyframes od-rs-wave-back {
      0%, 100% { transform: translateX(0) translateY(0); }
      50% { transform: translateX(-20px) translateY(6px); }
    }
    @keyframes od-rs-wave-mid {
      0%, 100% { transform: translateX(0) translateY(0); }
      50% { transform: translateX(24px) translateY(-8px); }
    }
    @keyframes od-rs-wave-front {
      0%, 100% { transform: translateX(0) translateY(0); }
      50% { transform: translateX(-30px) translateY(10px); }
    }
    @keyframes od-rs-ship {
      0%, 100% { transform: translate(720px, 620px) rotate(-10deg) translateY(-8px); }
      50% { transform: translate(720px, 620px) rotate(9deg) translateY(10px); }
    }
    @keyframes od-rs-rain {
      0% { transform: translateY(-140px); }
      100% { transform: translateY(900px); }
    }
  `}</style>
);
