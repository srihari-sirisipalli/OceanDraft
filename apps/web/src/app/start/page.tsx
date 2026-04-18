'use client';

import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { CompassMark } from '@/components/CompassMark';

export default function StartPage() {
  return (
    <Shell>
      <section className="shell-hero grid grid-cols-1 gap-16 py-16 md:grid-cols-2 md:gap-20 md:py-28">
        <div className="flex flex-col justify-center">
          <span className="eyebrow mb-6">Mission briefing</span>
          <h1 className="display-xl mb-6">Ready to cast off?</h1>
          <p className="lede mb-10">
            You'll be shown <strong className="text-sail-white">exactly one</strong>{' '}
            question. Pick the best answer — you get one shot at this, so read
            carefully and trust your compass.
          </p>

          <ul className="space-y-4 text-lg text-sail-white/90">
            <Item>One question only — make it count</Item>
            <Item>Single-correct multiple choice — no negative marking</Item>
            <Item>Time is measured from when the question appears</Item>
            <Item>Closing the browser may count as abandoned</Item>
          </ul>

          <div className="mt-10">
            <Link href="/question" className="btn-primary text-lg">
              Begin Assessment ⚓
            </Link>
          </div>
        </div>

        <div className="hidden items-center justify-center md:flex">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-blueprint-cyan/10 blur-3xl" />
            <CompassMark size={360} />
          </div>
        </div>
      </section>
    </Shell>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-2 h-2 w-2 flex-none rounded-full bg-blueprint-cyan" />
      <span>{children}</span>
    </li>
  );
}
