import { NextRequest, NextResponse } from "next/server";
import { supabaseAuth, isAuthConfigured } from "@/lib/auth";

export const dynamic = "force-dynamic";

// OAuth and email-confirmation links land here with a one-time code.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next") ?? "/";

  if (code && isAuthConfigured()) {
    const supabase = await supabaseAuth();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next.startsWith("/") ? next : "/", req.url));
    }
    console.error(`Auth callback failed on ${req.nextUrl.host}: ${error.message}`);
  } else {
    console.error(`Auth callback hit without a code on ${req.nextUrl.host}`);
  }
  return NextResponse.redirect(new URL("/login?error=callback", req.url));
}
