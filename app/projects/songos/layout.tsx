import "./songos.css";
import { Crimson_Pro } from "next/font/google";

const crimsonPro = Crimson_Pro({
  subsets: ["latin"],
  variable: "--font-crimson-pro",
  weight: ["200", "300", "400"],
});

export default function SongOSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={crimsonPro.variable}>{children}</div>;
}
