import type { Metadata } from 'next';
import './writual.css';

export const metadata: Metadata = {
  title: 'Writual',
  description: 'Journaling practice app',
};

export default function WritualLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
