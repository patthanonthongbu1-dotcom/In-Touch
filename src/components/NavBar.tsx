"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { IconBook, IconGear, IconNews, IconRefresh, IconUser } from "@/components/icons";
import { useUser } from "@/lib/use-user";
import logo from "@/app/In0Touch.png";

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
  const { user } = useUser();

  useEffect(() => {
    let raf = 0;
    // Hysteresis: shrink past 96px, only expand again above 16px. A single
    // threshold makes the bar oscillate, because shrinking changes the page
    // height and can move scrollY back across the same line.
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      setShrunk((prev) => (prev ? y > 16 : y > 96));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const itemBase =
    "flex flex-col items-center gap-0.5 rounded-2xl transition-all duration-200 sm:flex-row sm:gap-2";
  const itemPad = shrunk ? "px-2.5 py-1 sm:px-3.5" : "px-3 py-1.5 sm:px-4 sm:py-2";
  const labelSize = shrunk ? "text-[9px] sm:text-xs" : "text-[10px] sm:text-sm";
  const iconSize = shrunk ? 15 : 18;

  return (
    <header
      style={{ viewTransitionName: "site-header" }}
      className="sticky top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4"
    >
      <nav
        className={`glass-strong mx-auto flex w-full max-w-5xl items-center justify-between rounded-2xl transition-all duration-200 ${
          shrunk ? "px-3 py-1 sm:px-4 sm:py-1.5" : "px-4 py-2.5 sm:px-5 sm:py-3"
        }`}
      >
        <Link
          href="/"
          aria-label="InTouch — home"
          className="flex items-center transition-opacity duration-200 hover:opacity-70"
        >
          {/* The PNG has generous transparent padding, so it renders larger
              than the bar with negative margins and crops invisibly. */}
          <Image
            src={logo}
            alt="InTouch"
            priority
            className={`w-auto transition-all duration-200 ${shrunk ? "-my-7 h-18" : "-my-9 h-24"}`}
          />
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
                <Icon size={iconSize} className="transition-all duration-200" />
                <span className={`font-medium transition-all duration-200 ${labelSize}`}>{label}</span>
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
              className={`transition-all duration-200 ${refreshing ? "animate-spin" : ""}`}
            />
            <span className={`font-medium transition-all duration-200 ${labelSize}`}>
              {refreshing ? "…" : "Refresh"}
            </span>
          </button>

          {user ? (
            <Link
              href="/settings"
              aria-label="Your account"
              title={user.email ?? "Account"}
              className={`${itemBase} ${itemPad} text-neutral-600 hover:bg-white hover:text-neutral-950`}
            >
              <span
                className={`flex items-center justify-center rounded-full bg-neutral-950 font-bold text-white transition-all duration-200 ${
                  shrunk ? "h-[15px] w-[15px] text-[8px]" : "h-[18px] w-[18px] text-[10px]"
                }`}
              >
                {(user.email ?? "?").charAt(0).toUpperCase()}
              </span>
              <span className={`font-medium transition-all duration-200 ${labelSize}`}>Me</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className={`${itemBase} ${itemPad} ${
                pathname === "/login"
                  ? "bg-neutral-950 text-white shadow-md shadow-neutral-950/20"
                  : "text-neutral-600 hover:bg-white hover:text-neutral-950"
              }`}
            >
              <IconUser size={iconSize} className="transition-all duration-200" />
              <span className={`whitespace-nowrap font-medium transition-all duration-200 ${labelSize}`}>
                Sign in
              </span>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
