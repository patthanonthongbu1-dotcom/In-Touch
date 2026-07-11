"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

const LINKS = [
  { href: "/", icon: "🗞️", label: "Today" },
  { href: "/vocabulary", icon: "📚", label: "Vocab" },
  { href: "/settings", icon: "⚙️", label: "Settings" },
];

export default function NavBar() {
  const [shrunk, setShrunk] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();

  useEffect(() => {
    const onScroll = () => setShrunk(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const itemBase =
    "flex flex-col items-center rounded-2xl transition-all duration-300 sm:flex-row sm:gap-1.5";

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4">
      <nav
        className={`glass-strong mx-auto flex w-full max-w-5xl items-center justify-between rounded-2xl transition-all duration-300 ${
          shrunk ? "px-3 py-1 sm:px-4 sm:py-1.5" : "px-4 py-2.5 sm:px-5 sm:py-3"
        }`}
      >
        <Link
          href="/"
          className={`font-extrabold tracking-tight text-neutral-950 transition-all duration-300 hover:opacity-70 ${
            shrunk ? "text-base" : "text-lg"
          }`}
        >
          📰<span className="ml-1.5 hidden sm:inline">InTouch</span>
        </Link>

        <div className="flex items-center gap-0.5 sm:gap-1">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${itemBase} ${
                  shrunk ? "px-2.5 py-1 sm:px-3.5" : "px-3 py-1.5 sm:px-4 sm:py-2"
                } ${
                  active
                    ? "bg-neutral-950 text-white shadow-md shadow-neutral-950/20"
                    : "text-neutral-600 hover:bg-white hover:text-neutral-950"
                }`}
              >
                <span className={`transition-all duration-300 ${shrunk ? "text-sm" : "text-base"}`}>
                  {link.icon}
                </span>
                <span
                  className={`font-medium transition-all duration-300 ${
                    shrunk ? "text-[9px] sm:text-xs" : "text-[10px] sm:text-sm"
                  }`}
                >
                  {link.label}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            aria-label="Refresh news"
            onClick={() => startRefresh(() => router.refresh())}
            className={`${itemBase} text-neutral-600 hover:bg-white hover:text-neutral-950 ${
              shrunk ? "px-2.5 py-1 sm:px-3.5" : "px-3 py-1.5 sm:px-4 sm:py-2"
            }`}
          >
            <span
              className={`transition-all duration-300 ${shrunk ? "text-sm" : "text-base"} ${
                refreshing ? "animate-spin" : ""
              }`}
            >
              🔄
            </span>
            <span
              className={`font-medium transition-all duration-300 ${
                shrunk ? "text-[9px] sm:text-xs" : "text-[10px] sm:text-sm"
              }`}
            >
              {refreshing ? "…" : "Refresh"}
            </span>
          </button>
        </div>
      </nav>
    </header>
  );
}
