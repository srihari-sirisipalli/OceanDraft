export function CompassMark({ size = 80 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className="text-blueprint-cyan"
      aria-hidden
    >
      <g className="compass-spin" style={{ transformOrigin: '60px 60px' }}>
        <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
        <circle cx="60" cy="60" r="44" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.35" />
        {Array.from({ length: 16 }).map((_, i) => {
          const a = (i / 16) * Math.PI * 2;
          const x1 = 60 + Math.cos(a) * 44;
          const y1 = 60 + Math.sin(a) * 44;
          const x2 = 60 + Math.cos(a) * (i % 4 === 0 ? 52 : 48);
          const y2 = 60 + Math.sin(a) * (i % 4 === 0 ? 52 : 48);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeWidth={i % 4 === 0 ? 1.6 : 0.8}
              opacity={i % 4 === 0 ? 0.9 : 0.55}
            />
          );
        })}
      </g>
      <g>
        <path d="M60 16 L68 60 L60 104 L52 60 Z" fill="currentColor" opacity="0.9" />
        <path d="M60 16 L68 60 L60 60 Z" fill="#F4F7FA" opacity="0.7" />
        <circle cx="60" cy="60" r="5" fill="#0B2540" stroke="currentColor" strokeWidth="1.5" />
      </g>
    </svg>
  );
}
