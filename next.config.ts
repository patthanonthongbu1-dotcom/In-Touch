import type { NextConfig } from "next";
import { readFileSync } from "node:fs";

// package.json is the single source of truth for the version; the app reads it
// from here rather than keeping a second copy that can drift.
const { version } = JSON.parse(readFileSync("./package.json", "utf8")) as { version: string };

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
  async headers() {
    return [
      {
        // The worker must never be served from cache, or a stale one sticks
        // around and keeps shipping old behaviour after a deploy.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
