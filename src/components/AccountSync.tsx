"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@/lib/use-user";
import { saveSettings, useSettings, type AppSettings } from "@/lib/settings";

const JSON_HEADERS = { "Content-Type": "application/json" };

/**
 * Keeps the signed-in user's settings and read history in sync with their
 * account. Renders nothing. All app components keep reading/writing the
 * localStorage settings store; this is the single bridge to the server:
 *
 * 1. On login, pull server settings + reads, merge with local (union of
 *    reads), save locally, and push anything the server was missing.
 * 2. Afterwards, debounce-push local changes (new/removed reads, settings).
 */
export default function AccountSync() {
  const { user } = useUser();
  const settings = useSettings();
  // Server state we last synced to, or null before the initial merge.
  const syncedRef = useRef<{ userId: string; reads: Set<string> } | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const userId = user?.id ?? null;

  // Initial pull + merge when a session appears.
  useEffect(() => {
    if (!userId) {
      syncedRef.current = null;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [settingsRes, readsRes] = await Promise.all([
          fetch("/api/settings"),
          fetch("/api/reads"),
        ]);
        const { settings: server } = await settingsRes.json();
        const { ids } = await readsRes.json();
        if (cancelled) return;

        const local = settingsRef.current;
        const serverIds: string[] = ids ?? [];
        const merged: AppSettings = {
          ...local,
          ...((server ?? {}) as Partial<AppSettings>),
          pipelineSecret: local.pipelineSecret, // never leaves this device
          // A brand-new account (no synced settings yet) gets the welcome
          // tour once, right after joining.
          tutorialDone: server ? local.tutorialDone || Boolean(server.tutorialDone) : false,
          readArticles: [...new Set([...local.readArticles, ...serverIds])],
        };

        const localOnly = local.readArticles.filter((id) => !serverIds.includes(id));
        if (localOnly.length > 0) {
          await fetch("/api/reads", {
            method: "POST",
            headers: JSON_HEADERS,
            body: JSON.stringify({ articleIds: localOnly }),
          });
        }
        syncedRef.current = { userId, reads: new Set(merged.readArticles) };
        saveSettings(merged);
        await fetch("/api/settings", {
          method: "PUT",
          headers: JSON_HEADERS,
          body: JSON.stringify(merged),
        });
      } catch {
        // Offline or server hiccup — local keeps working; next load retries.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Debounced push of local changes after the initial merge.
  useEffect(() => {
    const synced = syncedRef.current;
    if (!userId || !synced || synced.userId !== userId) return;

    const timer = setTimeout(async () => {
      try {
        const current = new Set(settings.readArticles);
        const added = settings.readArticles.filter((id) => !synced.reads.has(id));
        const removed = [...synced.reads].filter((id) => !current.has(id));

        if (added.length > 0) {
          await fetch("/api/reads", {
            method: "POST",
            headers: JSON_HEADERS,
            body: JSON.stringify({ articleIds: added }),
          });
        }
        for (const id of removed) {
          await fetch(`/api/reads?articleId=${encodeURIComponent(id)}`, { method: "DELETE" });
        }
        synced.reads = current;
        await fetch("/api/settings", {
          method: "PUT",
          headers: JSON_HEADERS,
          body: JSON.stringify(settings),
        });
      } catch {
        // Dropped sync is retried on the next change or reload.
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [settings, userId]);

  return null;
}
