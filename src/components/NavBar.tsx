"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { IconBook, IconGear, IconNews, IconRefresh } from "@/components/icons";

const LINKS = [
  { href: "/", icon: IconNews, label: "Today" },
  { href: "/vocabulary", icon: IconBook, label: "Vocab" },
  { href: "/settings", icon: IconGear, label: "Settings" },
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
    "flex flex-col items-center gap-0.5 rounded-2xl transition-all duration-300 sm:flex-row sm:gap-2";
  const itemPad = shrunk ? "px-2.5 py-1 sm:px-3.5" : "px-3 py-1.5 sm:px-4 sm:py-2";
  const labelSize = shrunk ? "text-[9px] sm:text-xs" : "text-[10px] sm:text-sm";
  const iconSize = shrunk ? 15 : 18;

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4">
      <nav
        className={`glass-strong mx-auto flex w-full max-w-5xl items-center justify-between rounded-2xl transition-all duration-300 ${
          shrunk ? "px-3 py-1 sm:px-4 sm:py-1.5" : "px-4 py-2.5 sm:px-5 sm:py-3"
        }`}
      >
        <Link
          href="/"
          className="flex items-center gap-2 font-extrabold tracking-tight text-neutral-950 transition-all duration-300 hover:opacity-70"
        >
          <span
            className={`flex items-center justify-center rounded-xl bg-neutral-950 text-white transition-all duration-300 ${
              shrunk ? "h-7 w-7" : "h-9 w-9"
            }`}
          >
            <IconNews size={shrunk ? 15 : 19} />
          </span>
          <span className={`hidden transition-all duration-300 sm:inline ${shrunk ? "text-base" : "text-lg"}`}>
            InTouch
          </span>
        </Link>

        <div className="flex items-center gap-0.5 sm:gap-1">
          {LINKS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`${itemBase} ${itemPad} ${
                  active
                    ? "bg-neutral-950 text-white shadow-md shadow-neutral-950/20"
                    : "text-neutral-600 hover:bg-white hover:text-neutral-950"
                }`}
              >
                <Icon size={iconSize} className="transition-all duration-300" />
                <span className={`font-medium transition-all duration-300 ${labelSize}`}>{label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            aria-label="Refresh news"
            onClick={() => startRefresh(() => router.refresh())}
            className={`${itemBase} ${itemPad} text-neutral-600 hover:bg-white hover:text-neutral-950`}
          >
            <IconRefresh
              size={iconSize}
              className={`transition-all duration-300 ${refreshing ? "animate-spin" : ""}`}
            />
            <span className={`font-medium transition-all duration-300 ${labelSize}`}>
              {refreshing ? "…" : "Refresh"}
            </span>
          </button>
        </div>
      </nav>
    </header>
  );
}
