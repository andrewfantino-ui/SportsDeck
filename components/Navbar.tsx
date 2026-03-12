"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "📰 News Feed" },
  { href: "/debate", label: "🎤 Debate Arena" }
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 border-b border-white/10 bg-black/55 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-[var(--accent-red)] shadow-[0_0_16px_rgba(230,57,70,0.8)]" />
          <span
            className="text-3xl uppercase tracking-wider text-white"
            style={{ fontFamily: "\"Bebas Neue\", sans-serif" }}
          >
            SPORTSDECK
          </span>
        </Link>

        <div className="hidden items-center gap-2 sm:flex">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/85 sm:text-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent-red)] animate-pulse" />
          <span>LIVE UPDATES</span>
        </div>
      </div>
    </nav>
  );
}
