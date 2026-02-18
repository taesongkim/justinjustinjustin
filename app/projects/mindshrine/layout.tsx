import type { Metadata } from "next";
import { Crimson_Pro } from "next/font/google";

const crimsonPro = Crimson_Pro({
  subsets: ["latin"],
  variable: "--font-crimson-pro",
  weight: ["200"],
});

export const metadata: Metadata = {
  title: "MindShrine",
  description: "A visual shrine for your visions and goals",
};

export default function MindShrineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={crimsonPro.variable}
    >
      {children}
    </div>
  );
}
