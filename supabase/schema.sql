-- InTouch schema. Run this in the Supabase SQL editor (or `supabase db push`).

create extension if not exists pgcrypto;

create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  published_date date not null,
  headline text not null,
  source text not null default '',
  source_url text not null unique,
  category text not null,
  summary text not null default '',
  why_it_matters text not null default '',
  difficulty text not null default 'B2',        -- CEFR reading level B1–C2
  reading_time_min int not null default 2,
  importance int not null default 50,           -- 1–100, higher = more important
  vocabulary jsonb not null default '[]',       -- VocabEntry[] highlighted in the summary
  related jsonb not null default '[]',          -- headlines of merged/related coverage
  image_url text,                               -- lead image from the source RSS item
  source_published_at timestamptz,              -- when the source originally published it
  created_at timestamptz not null default now() -- when it was added to InTouch
);

-- Migrations for databases created before these columns (safe to re-run):
alter table articles add column if not exists image_url text;
alter table articles add column if not exists source_published_at timestamptz;

create index if not exists articles_date_idx on articles (published_date desc, importance desc);
create index if not exists articles_category_idx on articles (category);

create table if not exists vocab_bank (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'default',      -- becomes auth.uid() when multi-user lands
  word text not null,
  card jsonb not null,                          -- full VocabEntry snapshot
  article_id uuid references articles(id) on delete set null,
  article_headline text,
  learned_at timestamptz not null default now(),
  review_count int not null default 0,
  mastery int not null default 0,               -- 0–5
  favorite boolean not null default false,
  unique (user_id, word)
);

create index if not exists vocab_bank_user_idx on vocab_bank (user_id, learned_at desc);

-- The app talks to Supabase exclusively with the service-role key from the
-- server, so RLS stays enabled with no public policies: anon access is denied.
alter table articles enable row level security;
alter table vocab_bank enable row level security;

-- ---- Accounts (Supabase Auth) ----
-- user_id columns hold auth.uid()::text for signed-in users; the legacy
-- pre-auth rows use 'default' and are claimed by the first account to log in.

create table if not exists user_settings (
  user_id text primary key,
  settings jsonb not null default '{}',          -- AppSettings snapshot
  updated_at timestamptz not null default now()
);

create table if not exists article_reads (
  user_id text not null,
  article_id uuid not null references articles(id) on delete cascade,
  read_date date not null,                       -- Bangkok calendar day; drives the streak
  read_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

create index if not exists article_reads_user_date_idx on article_reads (user_id, read_date desc);

alter table user_settings enable row level security;
alter table article_reads enable row level security;
