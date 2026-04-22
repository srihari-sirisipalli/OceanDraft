import type { FC, SVGProps } from 'react';

/**
 * Reusable ship & maritime element SVG silhouettes. All viewBox ~400x200 and
 * scale by setting width/height on the wrapping <svg>. Designed to share one
 * two-tone marine palette: hull navy, blueprint cyan accents, brass gold
 * highlights, foam white for light.
 *
 * Each component renders _inside_ a caller-provided <svg> — so you control the
 * viewBox/transform from outside.
 */

type ShipProps = SVGProps<SVGGElement> & {
  accent?: string;
  hull?: string;
  trim?: string;
};

const DEFAULTS = {
  hull: '#0B2540',
  accent: '#2FB6C6',
  trim: '#C59D5F',
  light: '#F4EADC',
};

// ──────────────────────────────────────────────────────────────
// Container ship — realistic with stacked containers + tall bridge
// ──────────────────────────────────────────────────────────────

export const ContainerShip: FC<ShipProps> = ({
  accent = DEFAULTS.accent,
  hull = DEFAULTS.hull,
  trim = DEFAULTS.trim,
  ...g
}) => (
  <g {...g}>
    {/* hull with chine */}
    <path
      d="M10 120 L20 100 L340 100 L350 120 L330 150 L30 150 Z"
      fill={hull}
      stroke={accent}
      strokeOpacity="0.5"
    />
    {/* waterline strip */}
    <rect x="20" y="95" width="320" height="5" fill={trim} opacity="0.7" />
    {/* bridge superstructure (aft) */}
    <rect x="260" y="50" width="60" height="50" fill="#122F52" stroke={accent} strokeOpacity="0.4" />
    <rect x="268" y="60" width="10" height="8" fill={DEFAULTS.light} opacity="0.75" />
    <rect x="284" y="60" width="10" height="8" fill={DEFAULTS.light} opacity="0.75" />
    <rect x="300" y="60" width="10" height="8" fill={DEFAULTS.light} opacity="0.75" />
    <rect x="268" y="72" width="10" height="8" fill={DEFAULTS.light} opacity="0.55" />
    <rect x="284" y="72" width="10" height="8" fill={DEFAULTS.light} opacity="0.55" />
    {/* funnel */}
    <rect x="288" y="30" width="14" height="20" fill={trim} />
    <rect x="285" y="28" width="20" height="4" fill="#D04747" />
    {/* container stacks */}
    {['#3DB27D', '#C59D5F', '#D04747', '#2FB6C6', '#6B4C89', '#3DB27D'].map(
      (color, col) =>
        Array.from({ length: col === 0 || col === 5 ? 2 : 3 }).map((_, row) => (
          <rect
            key={`${col}-${row}`}
            x={40 + col * 36}
            y={100 - (row + 1) * 14}
            width={32}
            height={12}
            fill={color}
            opacity="0.85"
            stroke={hull}
            strokeOpacity="0.3"
          />
        )),
    )}
    {/* bow mast with light */}
    <line x1="30" y1="100" x2="30" y2="60" stroke={accent} strokeWidth="1.2" />
    <circle cx="30" cy="60" r="2" fill={DEFAULTS.light} />
    {/* anchor chain detail */}
    <line x1="22" y1="115" x2="18" y2="130" stroke={trim} strokeWidth="1" opacity="0.6" />
  </g>
);

// ──────────────────────────────────────────────────────────────
// Oil tanker — low, long hull with deck piping
// ──────────────────────────────────────────────────────────────

export const Tanker: FC<ShipProps> = ({
  accent = DEFAULTS.accent,
  hull = DEFAULTS.hull,
  trim = DEFAULTS.trim,
  ...g
}) => (
  <g {...g}>
    <path
      d="M10 130 L30 110 L350 110 L360 130 L345 160 L25 160 Z"
      fill={hull}
      stroke={accent}
      strokeOpacity="0.5"
    />
    <rect x="30" y="105" width="320" height="5" fill={trim} opacity="0.6" />
    {/* deck piping - horizontal manifold */}
    <line x1="40" y1="100" x2="260" y2="100" stroke={trim} strokeWidth="3" />
    {Array.from({ length: 6 }).map((_, i) => (
      <circle
        key={i}
        cx={60 + i * 36}
        cy={100}
        r={4}
        fill={trim}
        stroke={hull}
      />
    ))}
    {/* aft deckhouse */}
    <rect x="270" y="70" width="70" height="40" fill="#122F52" stroke={accent} strokeOpacity="0.4" />
    <rect x="278" y="78" width="10" height="8" fill={DEFAULTS.light} opacity="0.7" />
    <rect x="294" y="78" width="10" height="8" fill={DEFAULTS.light} opacity="0.7" />
    <rect x="310" y="78" width="10" height="8" fill={DEFAULTS.light} opacity="0.7" />
    <rect x="326" y="78" width="8" height="8" fill={DEFAULTS.light} opacity="0.7" />
    {/* funnel */}
    <rect x="294" y="50" width="16" height="22" fill={trim} />
    <rect x="291" y="48" width="22" height="4" fill="#D04747" />
    {/* bow kingpost */}
    <line x1="30" y1="105" x2="30" y2="70" stroke={accent} strokeWidth="1.2" />
  </g>
);

// ──────────────────────────────────────────────────────────────
// Cruise liner — tiered decks with many portholes
// ──────────────────────────────────────────────────────────────

export const CruiseLiner: FC<ShipProps> = ({
  accent = DEFAULTS.accent,
  hull = DEFAULTS.hull,
  trim = DEFAULTS.trim,
  ...g
}) => (
  <g {...g}>
    <path
      d="M5 140 L25 110 L370 110 L380 140 L355 165 L30 165 Z"
      fill={hull}
      stroke={accent}
      strokeOpacity="0.5"
    />
    {/* white tiered decks */}
    <rect x="40" y="85" width="320" height="25" fill={DEFAULTS.light} opacity="0.92" />
    <rect x="60" y="65" width="280" height="22" fill={DEFAULTS.light} opacity="0.92" />
    <rect x="80" y="48" width="240" height="18" fill={DEFAULTS.light} opacity="0.92" />
    {/* portholes lower deck */}
    {Array.from({ length: 30 }).map((_, i) => (
      <circle
        key={i}
        cx={45 + i * 11}
        cy={125}
        r={2}
        fill={DEFAULTS.light}
        opacity="0.9"
      />
    ))}
    {/* windows upper decks */}
    {Array.from({ length: 26 }).map((_, i) => (
      <rect
        key={`u1-${i}`}
        x={50 + i * 12}
        y={94}
        width={6}
        height={6}
        fill={accent}
        opacity="0.7"
      />
    ))}
    {Array.from({ length: 22 }).map((_, i) => (
      <rect
        key={`u2-${i}`}
        x={70 + i * 12}
        y={74}
        width={6}
        height={6}
        fill={accent}
        opacity="0.7"
      />
    ))}
    {/* two funnels */}
    <rect x="150" y="20" width="18" height="30" fill={trim} />
    <rect x="147" y="18" width="24" height="4" fill="#D04747" />
    <rect x="230" y="20" width="18" height="30" fill={trim} />
    <rect x="227" y="18" width="24" height="4" fill="#D04747" />
    {/* forward mast */}
    <line x1="80" y1="48" x2="80" y2="15" stroke={accent} strokeWidth="1" />
    <circle cx="80" cy="15" r="2" fill={DEFAULTS.light} />
  </g>
);

// ──────────────────────────────────────────────────────────────
// Sailboat — single mast with genoa + mainsail
// ──────────────────────────────────────────────────────────────

export const Sailboat: FC<ShipProps> = ({
  accent = DEFAULTS.accent,
  hull = DEFAULTS.hull,
  trim = DEFAULTS.trim,
  ...g
}) => (
  <g {...g}>
    {/* mainsail */}
    <path
      d="M190 10 L190 140 L110 140 Z"
      fill={DEFAULTS.light}
      opacity="0.9"
      stroke={hull}
    />
    {/* jib/genoa */}
    <path
      d="M190 15 L190 140 L250 140 Z"
      fill={DEFAULTS.light}
      opacity="0.75"
      stroke={hull}
    />
    {/* mast */}
    <line x1="190" y1="5" x2="190" y2="145" stroke={hull} strokeWidth="2" />
    {/* hull */}
    <path
      d="M70 140 L310 140 L290 165 L90 165 Z"
      fill={hull}
      stroke={trim}
      strokeWidth="1"
    />
    <rect x="80" y="135" width="220" height="5" fill={trim} opacity="0.6" />
    {/* cockpit */}
    <rect x="200" y="132" width="40" height="6" fill={accent} opacity="0.5" />
  </g>
);

// ──────────────────────────────────────────────────────────────
// Schooner — tall ship with 3 masts + rigging
// ──────────────────────────────────────────────────────────────

export const Schooner: FC<ShipProps> = ({
  accent = DEFAULTS.accent,
  hull = DEFAULTS.hull,
  trim = DEFAULTS.trim,
  ...g
}) => (
  <g {...g}>
    {/* hull with curved bow */}
    <path
      d="M20 140 Q50 95 90 130 L320 130 Q360 95 370 140 L345 170 L45 170 Z"
      fill={hull}
      stroke={trim}
      strokeWidth="1"
    />
    <rect x="60" y="126" width="280" height="4" fill={trim} opacity="0.55" />
    {/* three masts */}
    {[100, 200, 300].map((x, i) => (
      <g key={i}>
        <line x1={x} y1={130} x2={x} y2={20} stroke={hull} strokeWidth="1.5" />
        {/* yardarms */}
        <line x1={x - 40} y1={50} x2={x + 40} y2={50} stroke={hull} strokeWidth="1" />
        <line x1={x - 30} y1={75} x2={x + 30} y2={75} stroke={hull} strokeWidth="1" />
        {/* sails */}
        <path
          d={`M${x - 35} 52 L${x + 35} 52 L${x + 28} 72 L${x - 28} 72 Z`}
          fill={DEFAULTS.light}
          opacity="0.85"
        />
        <path
          d={`M${x - 28} 77 L${x + 28} 77 L${x + 20} 100 L${x - 20} 100 Z`}
          fill={DEFAULTS.light}
          opacity="0.85"
        />
      </g>
    ))}
    {/* bowsprit */}
    <line x1="20" y1="140" x2="-5" y2="125" stroke={hull} strokeWidth="2" />
    {/* flag */}
    <path d="M100 20 L120 24 L100 28 Z" fill="#D04747" />
  </g>
);

// ──────────────────────────────────────────────────────────────
// Submarine — sleek with sail (tower), periscope
// ──────────────────────────────────────────────────────────────

export const Submarine: FC<ShipProps> = ({
  accent = DEFAULTS.accent,
  hull = DEFAULTS.hull,
  trim = DEFAULTS.trim,
  ...g
}) => (
  <g {...g}>
    {/* body */}
    <path
      d="M10 120 Q40 95 90 95 L300 95 Q360 95 390 120 Q360 145 300 145 L90 145 Q40 145 10 120 Z"
      fill={hull}
      stroke={accent}
      strokeOpacity="0.5"
    />
    {/* sail */}
    <rect x="150" y="50" width="60" height="45" fill={hull} stroke={accent} strokeOpacity="0.5" />
    <rect x="148" y="48" width="64" height="4" fill={trim} />
    {/* periscope */}
    <line x1="180" y1="50" x2="180" y2="25" stroke={accent} strokeWidth="1.5" />
    <circle cx="180" cy="22" r="3" fill={trim} />
    {/* dive planes */}
    <path d="M320 120 L360 110 L360 130 Z" fill={hull} opacity="0.7" />
    {/* portholes */}
    {Array.from({ length: 6 }).map((_, i) => (
      <circle
        key={i}
        cx={80 + i * 30}
        cy={118}
        r={3}
        fill={accent}
        opacity="0.6"
      />
    ))}
  </g>
);

// ──────────────────────────────────────────────────────────────
// Tugboat — short, stocky with tall wheelhouse
// ──────────────────────────────────────────────────────────────

export const Tugboat: FC<ShipProps> = ({
  accent = DEFAULTS.accent,
  hull = DEFAULTS.hull,
  trim = DEFAULTS.trim,
  ...g
}) => (
  <g {...g}>
    <path
      d="M40 130 L60 100 L220 100 L240 130 L220 155 L60 155 Z"
      fill={hull}
      stroke={trim}
    />
    <rect x="60" y="95" width="160" height="5" fill={trim} opacity="0.65" />
    {/* wheelhouse */}
    <rect x="100" y="50" width="80" height="50" fill="#122F52" stroke={accent} strokeOpacity="0.4" />
    <rect x="108" y="58" width="18" height="12" fill={DEFAULTS.light} opacity="0.8" />
    <rect x="132" y="58" width="18" height="12" fill={DEFAULTS.light} opacity="0.8" />
    <rect x="156" y="58" width="18" height="12" fill={DEFAULTS.light} opacity="0.8" />
    {/* tall funnel */}
    <rect x="178" y="20" width="22" height="35" fill="#D04747" />
    <rect x="175" y="18" width="28" height="4" fill={trim} />
    {/* fender tires on side */}
    {[0, 1, 2, 3].map((i) => (
      <circle key={i} cx={70 + i * 45} cy={140} r={6} fill="#000" opacity="0.55" stroke={trim} />
    ))}
    {/* towing winch */}
    <rect x="220" y="90" width="14" height="12" fill={trim} />
  </g>
);

// ──────────────────────────────────────────────────────────────
// Fishing trawler — small, with crane/boom + gear
// ──────────────────────────────────────────────────────────────

export const Trawler: FC<ShipProps> = ({
  accent = DEFAULTS.accent,
  hull = DEFAULTS.hull,
  trim = DEFAULTS.trim,
  ...g
}) => (
  <g {...g}>
    <path
      d="M30 130 L60 105 L260 105 L280 130 L260 155 L55 155 Z"
      fill={hull}
      stroke={trim}
    />
    <rect x="60" y="100" width="200" height="5" fill={trim} opacity="0.55" />
    {/* wheelhouse aft */}
    <rect x="180" y="55" width="70" height="50" fill="#122F52" stroke={accent} strokeOpacity="0.4" />
    <rect x="188" y="63" width="14" height="10" fill={DEFAULTS.light} opacity="0.75" />
    <rect x="208" y="63" width="14" height="10" fill={DEFAULTS.light} opacity="0.75" />
    <rect x="228" y="63" width="14" height="10" fill={DEFAULTS.light} opacity="0.75" />
    {/* boom / a-frame */}
    <line x1="200" y1="60" x2="80" y2="20" stroke={trim} strokeWidth="2" />
    <line x1="200" y1="60" x2="80" y2="40" stroke={trim} strokeWidth="1" opacity="0.7" />
    {/* net bundle */}
    <circle cx="80" cy="30" r="10" fill={trim} opacity="0.5" />
    {/* mast */}
    <line x1="215" y1="55" x2="215" y2="10" stroke={accent} strokeWidth="1.5" />
    <circle cx="215" cy="10" r="2.5" fill={DEFAULTS.light} />
  </g>
);

// ──────────────────────────────────────────────────────────────
// Lighthouse — striped with cupola + beam source
// ──────────────────────────────────────────────────────────────

export const Lighthouse: FC<ShipProps> = ({
  accent = DEFAULTS.accent,
  hull = DEFAULTS.hull,
  trim = DEFAULTS.trim,
  ...g
}) => (
  <g {...g}>
    {/* rock base */}
    <path d="M10 170 Q50 145 100 150 Q130 152 150 170 Z" fill="#1a3352" />
    {/* tower */}
    <rect x="60" y="40" width="40" height="130" fill={DEFAULTS.light} stroke={trim} />
    <rect x="60" y="60" width="40" height="16" fill="#D04747" />
    <rect x="60" y="100" width="40" height="16" fill="#D04747" />
    <rect x="60" y="140" width="40" height="16" fill="#D04747" />
    {/* cupola walkway */}
    <rect x="54" y="32" width="52" height="10" fill={hull} />
    {/* lamp room */}
    <rect x="64" y="12" width="32" height="22" fill={hull} />
    <circle cx="80" cy="23" r="6" fill={trim}>
      <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
    </circle>
    {/* roof */}
    <path d="M60 12 L100 12 L80 0 Z" fill={hull} />
    <line x1="80" y1="0" x2="80" y2="-10" stroke={trim} strokeWidth="1.5" />
    {/* door */}
    <rect x="74" y="150" width="12" height="20" fill={trim} opacity="0.7" />
  </g>
);

// ──────────────────────────────────────────────────────────────
// Sea buoy — lit channel marker
// ──────────────────────────────────────────────────────────────

export const Buoy: FC<ShipProps> = ({
  hull = DEFAULTS.hull,
  trim = DEFAULTS.trim,
  ...g
}) => (
  <g {...g}>
    <path d="M40 130 L70 130 L62 160 L48 160 Z" fill="#D04747" stroke={hull} />
    <rect x="50" y="110" width="10" height="20" fill={trim} />
    <rect x="46" y="100" width="18" height="10" fill="#D04747" />
    <circle cx="55" cy="92" r="5" fill={trim}>
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite" />
    </circle>
    {/* ripples */}
    <path d="M20 160 Q55 156 90 160" stroke="#2FB6C6" strokeOpacity="0.4" fill="none" />
  </g>
);

// ──────────────────────────────────────────────────────────────
// Whale — breaching silhouette
// ──────────────────────────────────────────────────────────────

export const Whale: FC<ShipProps> = ({ hull = DEFAULTS.hull, ...g }) => (
  <g {...g}>
    <path
      d="M20 140 Q60 80 160 100 Q200 110 240 130 L220 140 Q180 160 120 155 Q60 150 20 140 Z"
      fill={hull}
      opacity="0.85"
    />
    {/* tail fluke */}
    <path d="M240 130 L270 100 L280 120 L255 135 Z" fill={hull} opacity="0.85" />
    {/* water spout */}
    <path
      d="M70 80 Q65 40 70 20 M70 80 Q75 40 85 25 M70 80 Q80 50 95 35"
      stroke="#2FB6C6"
      strokeOpacity="0.6"
      strokeWidth="2"
      fill="none"
    />
    {/* eye */}
    <circle cx="55" cy="128" r="2" fill="#F4EADC" />
  </g>
);

// ──────────────────────────────────────────────────────────────
// Helpers — seagulls, dock crane, palm, iceberg
// ──────────────────────────────────────────────────────────────

export const Seagull: FC<SVGProps<SVGGElement>> = (g) => (
  <g {...g}>
    <path
      d="M0 0 q 6 -8 12 0 q 6 -8 12 0"
      stroke={DEFAULTS.light}
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
    />
  </g>
);

export const PortCrane: FC<ShipProps> = ({
  hull = DEFAULTS.hull,
  trim = DEFAULTS.trim,
  ...g
}) => (
  <g {...g}>
    {/* legs */}
    <line x1="0" y1="150" x2="20" y2="0" stroke={hull} strokeWidth="4" />
    <line x1="80" y1="150" x2="60" y2="0" stroke={hull} strokeWidth="4" />
    {/* top horizontal */}
    <line x1="20" y1="0" x2="60" y2="0" stroke={hull} strokeWidth="6" />
    {/* boom */}
    <line x1="40" y1="0" x2="160" y2="-20" stroke={trim} strokeWidth="4" />
    <line x1="40" y1="0" x2="160" y2="10" stroke={hull} strokeWidth="2" opacity="0.6" />
    {/* cable */}
    <line x1="150" y1="-15" x2="150" y2="90" stroke="#888" strokeWidth="1" />
    {/* hook + container */}
    <rect x="135" y="90" width="30" height="18" fill="#C59D5F" />
  </g>
);

export const Iceberg: FC<ShipProps> = ({ hull = DEFAULTS.hull, ...g }) => (
  <g {...g}>
    <path
      d="M20 150 L50 60 L100 30 L140 70 L160 50 L190 150 Z"
      fill="#F4EADC"
      opacity="0.94"
      stroke={hull}
    />
    <path
      d="M50 60 L80 80 L100 30"
      stroke={hull}
      strokeWidth="0.5"
      fill="none"
      opacity="0.35"
    />
    {/* underwater shadow */}
    <path
      d="M10 150 L50 210 L170 210 L200 150 Z"
      fill="#2FB6C6"
      opacity="0.2"
    />
  </g>
);

export const Anchor: FC<SVGProps<SVGGElement>> = (g) => (
  <g {...g}>
    <circle cx="40" cy="10" r="6" fill="none" stroke={DEFAULTS.trim} strokeWidth="2" />
    <line x1="40" y1="16" x2="40" y2="70" stroke={DEFAULTS.trim} strokeWidth="3" />
    <path
      d="M15 60 Q20 80 40 80 Q60 80 65 60"
      fill="none"
      stroke={DEFAULTS.trim}
      strokeWidth="3"
      strokeLinecap="round"
    />
    <line x1="25" y1="30" x2="55" y2="30" stroke={DEFAULTS.trim} strokeWidth="3" />
  </g>
);
