"use client";

import { usePathname } from "next/navigation";
import { saveSettings, useSettings } from "@/lib/settings";
import { useUser } from "@/lib/use-user";
import { IconCheck } from "@/components/icons";

export default function MarkDone({ articleId }: { articleId: string }) {
  const settings = useSettings();
  const { user, loading } = useUser();
  const pathname = usePathname();
  const done = settings.readArticles.includes(articleId);

  function toggle() {
    // Marking a story read is what feeds the streak — it needs an account.
    if (!user) {
      window.location.assign(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    saveSettings({
      ...settings,
      readArticles: done
        ? settings.readArticles.filter((id) => id !== articleId)
        : [...settings.readArticles, articleId],
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={done}
      disabled={loading}
      className={`flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-200 disabled:opacity-60 ${
        done
          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"
          : "bg-neutral-950 text-white shadow-lg shadow-neutral-950/25 hover:-translate-y-0.5 hover:bg-neutral-800"
      }`}
    >
      <IconCheck size={16} />
      {!user && !loading
        ? "Sign in to mark as done"
        : done
          ? "Done — nice reading!"
          : "Mark as done"}
    </button>
  );
}
