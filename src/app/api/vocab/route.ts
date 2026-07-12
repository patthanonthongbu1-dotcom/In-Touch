import { NextRequest, NextResponse } from "next/server";
import { supabase, DEFAULT_USER_ID } from "@/lib/supabase";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Signed-in users own their bank; logged-out falls back to the shared
// pre-auth 'default' bank. The first account to touch vocab adopts the
// 'default' rows so an existing single-user bank follows its owner.
async function vocabUserId(): Promise<string> {
  const user = await getUser();
  if (!user) return DEFAULT_USER_ID;
  await supabase().from("vocab_bank").update({ user_id: user.id }).eq("user_id", DEFAULT_USER_ID);
  return user.id;
}

// GET /api/vocab — list saved words (optional ?q= search)
export async function GET(req: NextRequest) {
  const userId = await vocabUserId();
  const q = req.nextUrl.searchParams.get("q")?.trim();
  let query = supabase()
    .from("vocab_bank")
    .select("*")
    .eq("user_id", userId)
    .order("learned_at", { ascending: false });
  if (q) query = query.ilike("word", `%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}

// POST /api/vocab — save a clicked word (idempotent per user+word)
export async function POST(req: NextRequest) {
  const userId = await vocabUserId();
  const body = await req.json();
  const { word, card, articleId, articleHeadline } = body ?? {};
  if (!word || !card) {
    return NextResponse.json({ error: "word and card are required" }, { status: 400 });
  }

  const { data, error } = await supabase()
    .from("vocab_bank")
    .upsert(
      {
        user_id: userId,
        word: String(word).toLowerCase(),
        card,
        article_id: articleId ?? null,
        article_headline: articleHeadline ?? null,
      },
      { onConflict: "user_id,word", ignoreDuplicates: true }
    )
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: true, item: data });
}

// PATCH /api/vocab — { id, favorite? } or { id, reviewed: true, correct?: boolean }
export async function PATCH(req: NextRequest) {
  const userId = await vocabUserId();
  const body = await req.json();
  const { id, favorite, reviewed, correct } = body ?? {};
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const db = supabase();

  if (typeof favorite === "boolean") {
    const { error } = await db
      .from("vocab_bank")
      .update({ favorite })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (reviewed) {
    const { data: current, error: readError } = await db
      .from("vocab_bank")
      .select("review_count, mastery")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });

    const mastery =
      correct === false
        ? Math.max(0, current.mastery - 1)
        : Math.min(5, current.mastery + 1);

    const { error } = await db
      .from("vocab_bank")
      .update({ review_count: current.review_count + 1, mastery })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, mastery });
  }

  return NextResponse.json({ error: "nothing to update" }, { status: 400 });
}

// DELETE /api/vocab?id=...
export async function DELETE(req: NextRequest) {
  const userId = await vocabUserId();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabase()
    .from("vocab_bank")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
