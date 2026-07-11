import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InTouch — Daily News & English Learning",
  description:
    "The day's most important news with AI summaries and vocabulary learning built in.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-40 px-4 pt-4">
          <nav className="glass-strong mx-auto flex w-full max-w-5xl items-center justify-between rounded-2xl px-5 py-3">
            <Link
              href="/"
              className="text-lg font-extrabold tracking-tight transition-opacity hover:opacity-70"
            >
              📰 InTouch
            </Link>
            <div className="flex items-center gap-1 text-sm font-medium">
              <Link
                href="/"
                className="rounded-full px-4 py-2 text-neutral-600 transition-colors hover:bg-white hover:text-neutral-950"
              >
                Today
              </Link>
              <Link
                href="/vocabulary"
                className="rounded-full px-4 py-2 text-neutral-600 transition-colors hover:bg-white hover:text-neutral-950"
              >
                Vocabulary
              </Link>
            </div>
          </nav>
        </header>
        <main className="w-full flex-1">{children}</main>
        <footer className="mt-16 px-4 pb-8">
          <p className="mx-auto max-w-5xl border-t border-neutral-200/80 pt-6 text-center text-xs text-neutral-400">
            InTouch — read the world, grow your English.
          </p>
        </footer>
      </body>
    </html>
  );
}
