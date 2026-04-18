import Link from 'next/link';
import { Shell } from '@/components/Shell';

export default function DryDockPage() {
  return (
    <Shell>
      <section className="shell-hero py-16 md:py-24">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto mb-8 text-8xl">🛠️</div>
          <span className="eyebrow">Status · Dry dock</span>
          <h1 className="display-xl mt-3">The dry dock is empty</h1>
          <p className="lede mx-auto mt-4">
            No active questions right now — the crew is refitting the hull.
            Please come back soon.
          </p>
          <Link href="/" className="btn-secondary mt-10">
            Back to shore
          </Link>
        </div>
      </section>
    </Shell>
  );
}
