'use client';

import Link from 'next/link';
import { MarineFrame } from '@/components/MarineFrame';

export default function StartPage() {
  return (
    <MarineFrame
      title="Ready to cast off?"
      subtitle="You'll be shown exactly one question. Pick the best answer — you get one shot at this."
    >
      <div className="card space-y-4">
        <ul className="list-disc space-y-2 pl-5 text-sail-white/90">
          <li>One question only — make it count.</li>
          <li>Single correct answer; no negative marking.</li>
          <li>Your time is measured from when the question appears.</li>
          <li>Close the browser and your attempt may be counted as abandoned.</li>
        </ul>
        <Link href="/question" className="btn-primary w-full text-center">
          Begin Assessment ⚓
        </Link>
      </div>
    </MarineFrame>
  );
}
