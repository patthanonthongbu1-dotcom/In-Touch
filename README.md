# 📰 InTouch — Daily News & English Learning

Stay informed on the world's most important news while naturally improving your English. Every day the pipeline fetches news from trusted RSS feeds, merges duplicate coverage, ranks stories by global importance, and uses Claude to write learner-friendly summaries with clickable vocabulary. Tapped words are saved to your personal vocabulary bank for review.

**Stack:** Next.js (App Router, TypeScript) · Supabase (Postgres) · Anthropic Claude API · free RSS feeds (no news API key needed).

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/schema.sql`.
3. (Optional) Run `supabase/seed.sql` for two sample articles so the UI has content immediately.

### 2. Environment

```bash
cp .env.example .env.local
```

Fill in:

- `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — Supabase → Project Settings → API. The service-role key is only ever used server-side.
- `ANTHROPIC_API_KEY` — from [platform.claude.com](https://platform.claude.com).
- `CRON_SECRET` — any long random string; protects the `/api/pipeline` endpoint.

### 3. Run

```bash
npm install
npm run dev        # start the app at http://localhost:3000
npm run pipeline   # fetch, curate, summarize, and publish today's report
```

The pipeline call to Claude uses `claude-opus-4-8` by default (set `ANTHROPIC_MODEL` to change it) and typically takes a few minutes for a full daily report (~20 stories).

## How it works

```
RSS feeds (19 sources)
   → fetch + exact dedupe (URL/title, last 36h)          src/lib/pipeline/fetch.ts
   → Claude: merge same-event coverage, rank importance,
     categorize, select top stories                       src/lib/pipeline/curate.ts
   → Claude: summary, why-it-matters, CEFR difficulty,
     reading time, highlighted vocabulary (with Thai)     src/lib/pipeline/enrich.ts
   → upsert into Supabase                                 src/lib/pipeline/run.ts
```

Reading view (`/article/[id]`) highlights the vocabulary inside the summary. Tapping a word shows meaning, pronunciation, part of speech, CEFR level, example, synonyms, collocations, Thai translation, and why it's useful — and saves it to the vocabulary bank (`/vocabulary`), where you can search, favorite, review (mastery 0–5), and delete words.

## Scheduling the daily report

- **Locally / any machine:** run `npm run pipeline` on a schedule (Task Scheduler, cron).
- **Vercel:** deploy the repo; `vercel.json` defines a cron that hits `/api/pipeline` daily at 22:00 UTC (~5:00 Bangkok). Set `CRON_SECRET` in the Vercel project env — Vercel Cron sends it as the `Authorization` header automatically.

You can also trigger it manually: `GET /api/pipeline?secret=<CRON_SECRET>`.

## Extending

The schema is ready for the roadmap: `vocab_bank.user_id` defaults to `'default'` (single user) and becomes the auth user id when accounts are added. Next candidates from the vision doc: AI review activities (quiz generation from saved words), the article AI assistant, reading stats/streaks, and spaced repetition using `mastery` + `review_count`.
