"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await supabaseBrowser().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="rounded-full border border-neutral-300 bg-white/70 px-5 py-2.5 text-sm font-semibold text-neutral-600 transition-all duration-150 hover:border-neutral-950 hover:text-neutral-950 disabled:opacity-50"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
