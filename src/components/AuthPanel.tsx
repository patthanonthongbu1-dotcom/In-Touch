"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser, isAuthConfigured } from "@/lib/supabase-browser";

type Mode = "signin" | "signup";

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function AuthPanel() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(
    params.get("error") ? { kind: "error", text: "Sign-in didn't complete — please try again." } : null
  );

  const configured = isAuthConfigured();

  async function signInWithGoogle() {
    setMessage(null);
    setBusy(true);
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setMessage({ kind: "error", text: error.message });
      setBusy(false);
    }
    // On success the browser navigates to Google — no state to reset.
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    const supabase = supabaseBrowser();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage({ kind: "error", text: error.message });
        setBusy(false);
        return;
      }
      router.push("/");
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setMessage({ kind: "error", text: error.message });
      setBusy(false);
      return;
    }
    if (data.user && data.user.identities?.length === 0) {
      setMessage({ kind: "error", text: "That email already has an account — sign in instead." });
      setMode("signin");
      setBusy(false);
      return;
    }
    if (data.session) {
      router.push("/");
      router.refresh();
      return;
    }
    setMessage({
      kind: "info",
      text: "Almost there — check your email and click the confirmation link.",
    });
    setBusy(false);
  }

  if (!configured) {
    return (
      <div className="rounded-3xl bg-white/10 p-6 text-sm leading-relaxed text-white/80 ring-1 ring-white/20">
        Accounts aren&apos;t set up yet: add <code className="text-white">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
        to the environment and reload.
      </div>
    );
  }

  const inputClass =
    "w-full rounded-2xl bg-white/10 px-4 py-3 text-sm text-white outline-none ring-1 ring-white/20 transition-all placeholder:text-white/40 focus:bg-white/15 focus:ring-white/50";

  return (
    <div>
      <div className="flex rounded-full bg-white/10 p-1 text-sm font-medium ring-1 ring-white/15">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setMessage(null);
            }}
            className={`flex-1 rounded-full px-4 py-2 transition-all duration-200 ${
              mode === m ? "bg-white text-neutral-950 shadow" : "text-white/70 hover:text-white"
            }`}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={busy}
        className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-neutral-800 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleLogo />
        Continue with Google
      </button>

      <div className="my-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-white/40">
        <span className="h-px flex-1 bg-white/15" />
        or with email
        <span className="h-px flex-1 bg-white/15" />
      </div>

      <form onSubmit={submitEmail} className="space-y-3">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={inputClass}
        />
        <input
          type="password"
          required
          minLength={6}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "signin" ? "Password" : "Password (6+ characters)"}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-2xl bg-neutral-50/95 px-4 py-3 text-sm font-bold text-neutral-950 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create my account"}
        </button>
      </form>

      {message && (
        <p
          role="status"
          className={`mt-4 text-sm leading-relaxed ${
            message.kind === "error" ? "text-rose-300" : "text-emerald-300"
          }`}
        >
          {message.text}
        </p>
      )}

      <p className="mt-6 text-xs leading-relaxed text-white/50">
        An account keeps your vocabulary bank, settings, and reading streak with you on any device.
      </p>
    </div>
  );
}
