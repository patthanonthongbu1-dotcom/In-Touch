import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// The pipeline secret stays on the device it was typed on.
function sanitize(settings: Record<string, unknown>): Record<string, unknown> {
  const { pipelineSecret: _omit, ...rest } = settings;
  return rest;
}

// GET /api/settings — the signed-in user's synced settings (null if none yet)
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ settings: null });

  const { data, error } = await supabase()
    .from("user_settings")
    .select("settings")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data?.settings ?? null });
}

// PUT /api/settings — replace the synced settings snapshot
export async function PUT(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const body = await req.json();
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "settings object required" }, { status: 400 });
  }

  const { error } = await supabase()
    .from("user_settings")
    .upsert(
      { user_id: user.id, settings: sanitize(body), updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
