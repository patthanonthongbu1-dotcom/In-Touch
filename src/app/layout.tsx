import type { Metadata } from "next";
import { ViewTransition } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import NavBar from "@/components/NavBar";
import Tutorial from "@/components/Tutorial";
import AccountSync from "@/components/AccountSync";
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
        <NavBar />
        <Tutorial />
        <AccountSync />
        <main className="w-full flex-1">
          <ViewTransition
            enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "page-enter" }}
            exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "page-exit" }}
            default="none"
          >
            <div>{children}</div>
          </ViewTransition>
        </main>
        <footer className="mt-16 px-4 pb-8">
          <p className="mx-auto max-w-5xl border-t border-neutral-200/80 pt-6 text-center text-xs text-neutral-400">
            InTouch — read the world, grow your English.
          </p>
        </footer>
      </body>
    </html>
  );
}
