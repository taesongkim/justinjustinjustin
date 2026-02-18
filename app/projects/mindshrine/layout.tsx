import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MindShrine",
  description: "A visual shrine for your visions and goals",
};

export default function MindShrineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
