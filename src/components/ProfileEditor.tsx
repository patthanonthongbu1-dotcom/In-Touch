"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

const AVATAR_EMOJI = ["🦊", "🐼", "🐸", "🦉", "🐯", "🌸", "⚡", "🌊"] as const;

export default function ProfileEditor({
  initialName,
  initialEmoji,
  hasPhoto,
}: {
  initialName: string;
  initialEmoji: string;
  hasPhoto: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [emoji, setEmoji] = useState(initialEmoji);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const dirty = name.trim() !== initialName || emoji !== initialEmoji;

  async function save() {
    if (!name.trim()) return;
    setState("saving");
    const { error } = await supabaseBrowser().auth.updateUser({
      data: { full_name: name.trim(), avatar_emoji: emoji },
    });
    if (error) {
      setState("error");
      return;
    }
    setState("saved");
    router.refresh();
  }

  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
        Display name
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={name}
          maxLength={40}
          onChange={(e) => {
            setName(e.target.value);
            setState("idle");
          }}
          placeholder="How should we call you?"
          className="glass w-full max-w-xs rounded-full px-4 py-2.5 text-sm outline-none transition-all placeholder:text-neutral-400 focus:bg-white focus:shadow-lg"
        />
      </div>

      {!hasPhoto && (
        <>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Avatar
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {AVATAR_EMOJI.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setEmoji(option);
                  setState("idle");
                }}
                aria-pressed={emoji === option}
                className={`flex h-11 w-11 items-center justify-center rounded-full text-xl transition-all ${
                  emoji === option
                    ? "bg-neutral-950 shadow-lg shadow-neutral-950/20"
                    : "glass hover:bg-white"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || !name.trim() || state === "saving"}
          className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-neutral-950/20 transition-all duration-150 hover:-translate-y-0.5 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {state === "saving" ? "Saving…" : "Save changes"}
        </button>
        {state === "saved" && <span className="text-sm font-medium text-emerald-700">✓ Saved</span>}
        {state === "error" && <span className="text-sm text-red-600">Couldn&apos;t save — try again.</span>}
      </div>
    </div>
  );
}
