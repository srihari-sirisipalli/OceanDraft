import Link from 'next/link';
import { Shell } from '@/components/Shell';

export const metadata = {
  title: 'Privacy Notice · OceanDraft',
};

export default function PrivacyPage() {
  return (
    <Shell>
      <section className="shell-pad py-12 md:py-16">
        <div className="mx-auto w-full max-w-3xl">
          <span className="eyebrow">Legal</span>
          <h1 className="display-lg mt-3">Privacy notice</h1>
          <p className="lede mt-4">
            This is the default privacy notice shipped with OceanDraft. Admins
            can replace it by setting <code>privacy.policy_url</code> to their
            own URL in <Link href="/admin/settings" className="underline">admin → settings</Link>.
          </p>

          <div className="panel mt-10 space-y-6 text-sail-white/85 leading-relaxed">
            <Block title="What we collect">
              If you participate in this assessment, we collect your mobile
              number (in E.164 format), a consent timestamp, and metadata
              about your attempt: the question you were shown, the answer you
              chose, timings (when the question appeared, when you submitted),
              your IP address, and your browser's user-agent string.
            </Block>

            <Block title="Why">
              To verify you are a real human with access to the number you
              entered (via a one-time SMS code), to evaluate your answer, and
              to give the booth operator aggregated analytics about the
              event.
            </Block>

            <Block title="Who we share it with">
              Your mobile number is passed to an SMS gateway solely to deliver
              the verification code. No other third party receives your data.
            </Block>

            <Block title="How long we keep it">
              Mobile numbers and attempt logs are retained for up to
              <strong> 180 days</strong> by default, after which the mobile
              number is scrubbed from the database. Admins can configure a
              shorter retention window.
            </Block>

            <Block title="Your rights">
              You may request access to or deletion of data associated with
              your mobile number at any time by contacting the event
              organiser. Masked mobile numbers are used in all admin-facing
              reports by default; only authorised operators can view the full
              number.
            </Block>

            <Block title="Cookies">
              The system sets short-lived session cookies to remember your
              verified status during the attempt. These expire within a few
              minutes and contain no personal data themselves (only an opaque
              session identifier).
            </Block>

            <Block title="Contact">
              For questions or deletion requests, contact the event organiser
              at the booth.
            </Block>
          </div>

          <div className="mt-8 flex justify-center">
            <Link href="/" className="btn-secondary">
              ← Back to start
            </Link>
          </div>
        </div>
      </section>
    </Shell>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-2 font-display text-xl text-blueprint-cyan">{title}</h2>
      <p>{children}</p>
    </div>
  );
}
