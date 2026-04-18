import Link from 'next/link';
import { MarineFrame } from '@/components/MarineFrame';

export default function DryDockPage() {
  return (
    <MarineFrame
      title="The dry dock is empty"
      subtitle="No active questions are available right now. Our crew is refitting the hull — please come back soon."
    >
      <div className="card text-center">
        <div className="mx-auto mb-6 text-6xl">🛠️</div>
        <Link href="/" className="btn-secondary">
          Back to shore
        </Link>
      </div>
    </MarineFrame>
  );
}
