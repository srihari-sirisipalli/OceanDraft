import type { Metadata } from 'next';
import './globals.css';
import { PageTransition } from '@/components/PageTransition';

export const metadata: Metadata = {
  title: 'OceanDraft — Marine & Naval Architecture Assessment',
  description:
    'A single-question marine and naval architecture assessment platform. Verify by mobile, answer one question, see instant results.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
