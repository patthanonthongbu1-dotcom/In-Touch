import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "InTouch — Daily News & English Learning",
    short_name: "InTouch",
    description:
      "The day's most important news with AI summaries and vocabulary learning built in.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0a0a0a",
    categories: ["news", "education"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android masks icons to a circle/squircle; these keep the logo inside
      // the safe zone so it isn't shaved at the edges.
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today", short_name: "Today", url: "/" },
      { name: "Vocabulary", short_name: "Vocab", url: "/vocabulary" },
      { name: "Practice", short_name: "Practice", url: "/practice" },
    ],
  };
}
