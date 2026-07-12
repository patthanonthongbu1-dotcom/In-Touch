---
name: verify
description: Build, launch, and visually verify the InTouch Next.js app (desktop + mobile viewports)
---

# Verifying InTouch changes

## Build & launch

```bash
npx next build            # must pass first; TypeScript runs inside
npx next start -p 3789    # production server (background); dev server also works: npx next dev
curl -s -o /dev/null -w "%{http_code}" http://localhost:3789/   # wait for 200
```

Requires `.env.local` (Supabase vars) — the homepage is `force-dynamic` and reads the DB on every request.

## Driving the UI

No Playwright in the project; install it in the scratchpad (`npm i playwright`) and launch with
`chromium.launch({ channel: "msedge" })` — Edge is installed on this machine, Chrome is not.

Gotchas:
- A first-visit tutorial overlay blocks everything. Dismiss it before screenshots by seeding
  localStorage **on the app's origin, then reloading**:
  `localStorage.setItem("intouch-settings", JSON.stringify({ tutorialDone: true, hiddenCategories: [], readArticles: [] }))`
- Mobile layout checks: viewport 390×844 (also probe 320px). No horizontal overflow means
  `document.documentElement.scrollWidth === innerWidth`.
- The news grid container is `div.mt-6.grid` on the homepage; first child is the featured card.
- Category filter pills carry `data-pill` attributes — click one to probe the non-featured layout.

## Pipeline (news fetching)

`npm run pipeline` runs it locally against the real Supabase DB — **it consumes Gemini free-tier
daily quota (20 requests/day for gemini-3.5-flash) and writes to production data; don't run it
casually.** Production runs it via Vercel cron (see `vercel.json`) hitting `/api/pipeline`
with `CRON_SECRET`.
