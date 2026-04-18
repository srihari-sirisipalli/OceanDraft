import Link from 'next/link';
import { Shell } from '@/components/Shell';

export default function BlockedPage() {
  return (
    <Shell>
      <section className="shell-hero py-16 md:py-24">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto mb-8 text-8xl">⛵</div>
          <span className="eyebrow">Already sailed</span>
          <h1 className="display-xl mt-3">This log is complete</h1>
          <p className="lede mx-auto mt-4">
            This mobile number has already completed an attempt. Attempts are
            limited per the current policy.
          </p>
          <Link href="/" className="btn-secondary mt-10">
            Return to harbour
          </Link>
        </div>
      </section>
    </Shell>
  );
}
