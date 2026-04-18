export function WaveFooter() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden">
      <svg
        viewBox="0 0 1440 140"
        className="block w-full"
        preserveAspectRatio="none"
      >
        <path
          d="M0,70 C240,120 480,20 720,60 C960,100 1200,30 1440,70 L1440,140 L0,140 Z"
          fill="rgba(47,182,198,0.08)"
        />
        <path
          d="M0,90 C240,60 480,130 720,90 C960,50 1200,120 1440,90 L1440,140 L0,140 Z"
          fill="rgba(47,182,198,0.12)"
        />
        <path
          d="M0,110 C240,140 480,90 720,120 C960,150 1200,100 1440,120 L1440,140 L0,140 Z"
          fill="rgba(47,182,198,0.16)"
        />
      </svg>
    </div>
  );
}
