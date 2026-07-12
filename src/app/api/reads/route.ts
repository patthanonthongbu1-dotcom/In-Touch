import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getUser } from "@/lib/auth";
import { computeStreak, todayBangkok } from "@/lib/streak";

export const dynamic = "force-dynamic";

// GET /api/reads — the signed-in user's read article ids + streak
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ ids: [], streak: 0, readToday: false });

  const { data, error } = await supabase()
    .from("article_reads")
    .select("article_id, read_date")
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const { streak, readToday } = computeStreak(rows.map((r) => r.read_date));
  return NextResponse.json({ ids: rows.map((r) => r.article_id), streak, readToday });
}

// POST /api/reads — { articleId } or { articleIds } marks articles read today
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const body = await req.json();
  const ids: string[] = body?.articleIds ?? (body?.articleId ? [body.articleId] : []);
  if (ids.length === 0) {
    return NextResponse.json({ error: "articleId is required" }, { status: 400 });
  }

  const today = todayBangkok();
  const { error } = await supabase()
    .from("article_reads")
    .upsert(
      ids.map((articleId) => ({ user_id: user.id, article_id: articleId, read_date: today })),
      { onConflict: "user_id,article_id", ignoreDuplicates: true } // keep the original read day
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/reads?articleId=... — unmark (an un-done article stops counting)
export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const articleId = req.nextUrl.searchParams.get("articleId");
  if (!articleId) return NextResponse.json({ error: "articleId is required" }, { status: 400 });

  const { error } = await supabase()
    .from("article_reads")
    .delete()
    .eq("user_id", user.id)
    .eq("article_id", articleId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
