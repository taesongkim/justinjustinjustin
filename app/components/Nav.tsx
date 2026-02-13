"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 backdrop-blur-md bg-black/30 border-b border-white/5">
      <Link
        href="/"
        className="text-lg font-semibold tracking-tight hover:opacity-70 transition-opacity"
      >
        justinjustinjustin
      </Link>

      <ul className="flex gap-8">
        {links.map(({ href, label }) => {
          const isActive = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                className={`text-sm tracking-wide transition-opacity ${
                  isActive
                    ? "opacity-100 font-medium"
                    : "opacity-50 hover:opacity-80"
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
