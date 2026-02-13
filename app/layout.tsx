import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";
import Nav from "./components/Nav";
import Scene from "./components/Scene";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
});

export const metadata: Metadata = {
  title: "justinjustinjustin",
  description: "justinjustinjustin.com",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${interTight.variable} antialiased font-sans`}>
        {/* 3D background — persists across page navigations */}
        <Scene />

        {/* Navigation — persists across page navigations */}
        <Nav />

        {/* Page content — this is the only part that swaps */}
        <main className="relative z-10 pt-24 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
