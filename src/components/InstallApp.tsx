"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { IconCheck } from "@/components/icons";

// Chromium fires this so a site can offer its own install button. Safari never
// does — iOS installs only through the Share sheet — so the UI below covers
// both paths rather than promising a button that can't exist.
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STANDALONE = "(display-mode: standalone)";

// Environment facts, not state: read them from the browser rather than syncing
// them into React with an effect. Both fall back to false on the server.
function useStandalone(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(STANDALONE);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(STANDALONE).matches,
    () => false
  );
}

function useIsIOS(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => /iPad|iPhone|iPod/.test(navigator.userAgent),
    () => false
  );
}

export default function InstallApp() {
  const standalone = useStandalone();
  const isIOS = useIsIOS();
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [justInstalled, setJustInstalled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault(); // hold onto it so the button below can fire it later
      setPromptEvent(e as InstallPromptEvent);
    }
    function onInstalled() {
      setJustInstalled(true);
      setPromptEvent(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) return;
    setBusy(true);
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") setJustInstalled(true);
    setPromptEvent(null);
    setBusy(false);
  }

  if (standalone || justInstalled) {
    return (
      <p className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-700">
        <IconCheck size={15} /> InTouch is installed on this device.
      </p>
    );
  }

  if (promptEvent) {
    return (
      <button
        type="button"
        onClick={install}
        disabled={busy}
        className="mt-4 rounded-full border border-neutral-950 bg-transparent px-5 py-2.5 text-sm font-semibold text-neutral-950 transition-all duration-150 hover:-translate-y-0.5 hover:bg-neutral-950 hover:text-white disabled:opacity-50"
      >
        {busy ? "Installing…" : "Install InTouch"}
      </button>
    );
  }

  if (isIOS) {
    return (
      <p className="mt-4 text-sm leading-relaxed text-neutral-500">
        On iPhone or iPad, tap <span className="font-semibold text-neutral-950">Share</span> at the
        bottom of Safari, then{" "}
        <span className="font-semibold text-neutral-950">Add to Home Screen</span>.
      </p>
    );
  }

  return (
    <p className="mt-4 text-sm leading-relaxed text-neutral-500">
      Your browser hasn&apos;t offered the install prompt yet — it usually appears after a couple of
      visits, or from the install icon in the address bar. Chrome, Edge, and Android Chrome all
      support it.
    </p>
  );
}
