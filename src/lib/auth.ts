import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Auth-aware Supabase client bound to the request's session cookies.
 * Use only to identify the user — data access goes through the
 * service-role client in `supabase.ts`, keyed by the user id.
 */
export async function supabaseAuth(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components may not set cookies; proxy.ts persists
            // refreshed sessions instead.
          }
        },
      },
    }
  );
}

/** The signed-in user, or null when logged out or auth isn't configured. */
export async function getUser(): Promise<User | null> {
  if (!isAuthConfigured()) return null;
  const supabase = await supabaseAuth();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
