import { NextRequest, NextResponse } from "next/server";
import { supabaseAuth, isAuthConfigured } from "@/lib/auth";

export const dynamic = "force-dynamic";

// OAuth and email-confirmation links land here with a one-time code.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const code = params.get("code");
  const next = params.get("next") ?? "/";
  let reason = "callback";

  if (code && isAuthConfigured()) {
    const supabase = await supabaseAuth();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next.startsWith("/") ? next : "/", req.url));
    }
    reason = error.message;
    console.error(`Auth callback failed on ${req.nextUrl.host}: ${error.message}`);
  } else {
    // Supabase reports failures as error/error_description query params.
    reason = params.get("error_description") ?? params.get("error") ?? "no code returned";
    console.error(
      `Auth callback hit without a code on ${req.nextUrl.host}; params: ${req.nextUrl.search}`
    );
  }
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent(reason)}`, req.url)
  );
}
