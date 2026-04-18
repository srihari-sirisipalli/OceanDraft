import Link from 'next/link';
import { MarineFrame } from '@/components/MarineFrame';

export default function BlockedPage() {
  return (
    <MarineFrame
      title="Already sailed"
      subtitle="This mobile number has already completed an attempt. Attempts are limited per the current policy."
    >
      <div className="card text-center">
        <div className="mx-auto mb-6 text-6xl">⛵</div>
        <Link href="/" className="btn-secondary">
          Return to harbour
        </Link>
      </div>
    </MarineFrame>
  );
}
