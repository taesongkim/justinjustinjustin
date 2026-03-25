import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "The Artist's Way — Participant Guide",
  description: "What to expect, what you're agreeing to, and what to do when things don't go to plan.",
  robots: 'noindex, nofollow',
};

export default function AWGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#f7f3ec', minHeight: '100vh' }}>
      {children}
    </div>
  );
}
