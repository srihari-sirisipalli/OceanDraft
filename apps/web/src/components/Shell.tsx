import Link from 'next/link';
import type { ReactNode } from 'react';
import { WaveFooter } from './WaveFooter';
import { MuteButton } from './MuteButton';
import { ShipBackground } from './ShipBackground';
import { pickSceneFlavor, type SceneCtx } from '@/lib/scene-picker';

type Scene =
  | 'reveal'
  | 'question'
  | 'result-correct'
  | 'result-wrong'
  | 'timeout'
  | 'default';

export function TopBar({ right }: { right?: ReactNode }) {
  return (
    <header className="top-nav">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 md:px-10">
        <Link href="/" className="flex items-center gap-3">
          <svg width="32" height="32" viewBox="0 0 40 40" className="text-blueprint-cyan wave-sway">
            <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M20 4 L20 36 M4 20 L36 20" stroke="currentColor" strokeWidth="1" opacity="0.6" />
            <path d="M20 8 L24 20 L20 32 L16 20 Z" fill="currentColor" />
          </svg>
          <span className="font-display text-xl font-bold tracking-[0.2em] text-sail-white">
            OCEANDRAFT
          </span>
        </Link>
        <div className="flex items-center gap-3">
          {right ?? (
            <span className="eyebrow hidden md:inline">Marine · Naval · Assessment</span>
          )}
          <MuteButton />
        </div>
      </div>
    </header>
  );
}

export function Shell({
  children,
  topRight,
  hideWaves,
  scene,
  sceneCtx,
}: {
  children: ReactNode;
  topRight?: ReactNode;
  hideWaves?: boolean;
  scene?: Scene;
  sceneCtx?: Omit<SceneCtx, 'variant'>;
}) {
  const flavor =
    scene && sceneCtx
      ? pickSceneFlavor({ variant: scene, ...sceneCtx })
      : undefined;
  return (
    <div className="shell">
      <TopBar right={topRight} />
      <div className="relative flex-1">
        {scene && <ShipBackground variant={scene} flavor={flavor} />}
        <div className="relative z-10 flex min-h-full flex-col">{children}</div>
      </div>
      {!hideWaves && <WaveFooter />}
    </div>
  );
}
