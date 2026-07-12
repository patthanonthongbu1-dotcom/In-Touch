import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { computeStreak, todayBangkok } from "@/lib/streak";
import ProfileEditor from "@/components/ProfileEditor";
import SignOutButton from "@/components/SignOutButton";
import Link from "next/link";
import {
  IconBook,
  IconCheck,
  IconFlame,
  IconNews,
  IconPencil,
  IconSparkles,
  IconStar,
} from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata = { title: "Profile — InTouch" };

const DAY_MS = 86_400_000;
const CEFR_BANDS = ["A2", "B1", "B2", "C1", "C2"];

function lastDays(today: string, count: number): string[] {
  const end = Date.parse(`${today}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) =>
    new Date(end - (count - 1 - i) * DAY_MS).toISOString().slice(0, 10)
  );
}

export default async function ProfilePage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const db = supabase();
  const [readsRes, vocabRes, settingsRes] = await Promise.all([
    db.from("article_reads").select("read_date").eq("user_id", user.id),
    db.from("vocab_bank").select("favorite, review_count").eq("user_id", user.id),
    db.from("user_settings").select("settings").eq("user_id", user.id).maybeSingle(),
  ]);

  const synced = (settingsRes.data?.settings ?? {}) as {
    cefrLevel?: string | null;
    cefrTestedAt?: string | null;
  };
  const cefrLevel = synced.cefrLevel ?? null;
  const cefrTestedAt = synced.cefrTestedAt
    ? new Date(synced.cefrTestedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const readDates = (readsRes.data ?? []).map((r) => r.read_date as string);
  const today = todayBangkok();
  const { streak, readToday } = computeStreak(readDates, today);
  const readDaySet = new Set(readDates);
  const week = lastDays(today, 7);
  const month = lastDays(today, 35); // five full weeks for the streak calendar

  const vocab = vocabRes.data ?? [];
  const stats = [
    { icon: IconNews, value: readDates.length, label: "stories read" },
    { icon: IconBook, value: vocab.length, label: "words saved" },
    { icon: IconStar, value: vocab.filter((v) => v.favorite).length, label: "favorites" },
    {
      icon: IconCheck,
      value: vocab.reduce((sum, v) => sum + (v.review_count ?? 0), 0),
      label: "reviews done",
    },
  ];

  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  const displayName = meta.full_name || user.email?.split("@")[0] || "Reader";
  const avatarUrl = meta.avatar_url;
  const avatarEmoji = meta.avatar_emoji || "🦊";
  const memberSince = new Date(user.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl px-4 pt-12">
      {/* Identity card */}
      <section className="glass rounded-3xl p-6 sm:p-8">
        <div className="flex items-center gap-5">
          {avatarUrl ? (
            /* Google profile photos come from lh3.googleusercontent.com. */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="h-20 w-20 rounded-full object-cover shadow-lg ring-2 ring-white"
            />
          ) : (
            <span className="glass flex h-20 w-20 items-center justify-center rounded-full text-4xl shadow-lg">
              {avatarEmoji}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-neutral-950 sm:text-3xl">
              <span className="truncate">{displayName}</span>
              {cefrLevel && (
                <span className="shrink-0 rounded-full border border-neutral-950 px-2.5 py-0.5 text-xs font-bold text-neutral-950">
                  {cefrLevel}
                </span>
              )}
            </h1>
            <p className="mt-1 truncate text-sm text-neutral-500">{user.email}</p>
            <p className="mt-0.5 text-xs text-neutral-400">Reading since {memberSince}</p>
          </div>
        </div>

      </section>

      {/* Streak — this page is its home */}
      <section className="glass mt-5 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-5">
          <span
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${
              readToday
                ? "bg-neutral-950 text-white shadow-lg shadow-neutral-950/25"
                : "bg-white/70 text-neutral-400 ring-1 ring-neutral-200/70"
            }`}
          >
            <IconFlame size={28} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-3xl font-extrabold tracking-tight text-neutral-950 sm:text-4xl">
              {streak} <span className="text-lg font-bold text-neutral-500">day streak</span>
            </p>
            <p className="mt-0.5 text-sm text-neutral-500">
              {readToday
                ? "Today's read is in — streak safe."
                : streak > 0
                  ? "Read one story today to keep it going."
                  : "Read one story today to light the flame."}
            </p>
          </div>
        </div>

        {/* This week */}
        <div className="mt-6 flex gap-2">
          {week.map((day) => {
            const done = readDaySet.has(day);
            const isToday = day === today;
            const letter = new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
              weekday: "narrow",
              timeZone: "UTC",
            });
            return (
              <div key={day} className="flex flex-1 flex-col items-center gap-1.5">
                <span
                  className={`flex h-9 w-full items-center justify-center rounded-xl text-xs font-bold transition-all ${
                    done
                      ? "bg-neutral-950 text-white shadow-md shadow-neutral-950/20"
                      : `bg-white/60 text-neutral-300 ring-1 ring-neutral-200/70 ${
                          isToday ? "ring-2 ring-neutral-950/40" : ""
                        }`
                  }`}
                >
                  {done && <IconCheck size={13} />}
                </span>
                <span className={`text-[10px] font-medium ${isToday ? "text-neutral-950" : "text-neutral-400"}`}>
                  {letter}
                </span>
              </div>
            );
          })}
        </div>

        {/* Last five weeks */}
        <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Last 5 weeks
        </p>
        <div className="mt-2 grid grid-cols-7 gap-1.5">
          {month.map((day) => {
            const done = readDaySet.has(day);
            const isToday = day === today;
            return (
              <span
                key={day}
                title={`${day}${done ? " — read ✓" : ""}`}
                className={`h-5 rounded-md transition-all ${
                  done
                    ? "bg-neutral-950"
                    : `bg-neutral-950/[0.06] ${isToday ? "ring-1 ring-neutral-950/40" : ""}`
                }`}
              />
            );
          })}
        </div>
      </section>

      {/* Stats */}
      <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass rounded-3xl p-4 text-center sm:p-5">
            <stat.icon aria-hidden size={20} className="mx-auto text-neutral-400" />
            <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-neutral-950 sm:text-3xl">
              {stat.value}
            </p>
            <p className="mt-0.5 text-xs font-medium text-neutral-400">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* English level */}
      <section className="glass mt-5 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-bold text-neutral-950">
              <IconSparkles size={17} /> English level
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              {cefrLevel
                ? `Estimated ${cefrLevel} · tested ${cefrTestedAt}`
                : "Take a quick word test to estimate your CEFR reading level."}
            </p>
          </div>
          <Link
            href="/review"
            className="shrink-0 rounded-full border border-neutral-950 bg-transparent px-5 py-2.5 text-sm font-semibold text-neutral-950 transition-all duration-150 hover:-translate-y-0.5 hover:bg-neutral-950 hover:text-white"
          >
            {cefrLevel ? "Retake the test" : "Test my level"}
          </Link>
        </div>

        {/* CEFR ladder — steps rise toward C2, filled up to the tested level */}
        <div className="mt-6 flex items-end gap-2">
          {CEFR_BANDS.map((band, i) => {
            const levelIndex = cefrLevel ? CEFR_BANDS.indexOf(cefrLevel) : -1;
            const reached = i <= levelIndex;
            const isCurrent = i === levelIndex;
            return (
              <div key={band} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  style={{ height: `${22 + i * 10}px` }}
                  className={`w-full rounded-lg transition-all ${
                    reached
                      ? "bg-neutral-950 shadow-md shadow-neutral-950/20"
                      : "bg-neutral-950/[0.07] ring-1 ring-neutral-200/70"
                  } ${isCurrent ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-white/60" : ""}`}
                />
                <span
                  className={`text-[10px] font-bold ${
                    isCurrent ? "text-neutral-950" : reached ? "text-neutral-500" : "text-neutral-300"
                  }`}
                >
                  {band}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Customization */}
      <section className="glass mt-5 rounded-3xl p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-lg font-bold text-neutral-950">
          <IconPencil size={17} /> Make it yours
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          {avatarUrl
            ? "Your photo comes from your Google account; pick the name you want to see."
            : "Pick your name and an avatar."}
        </p>
        <div className="mt-5">
          <ProfileEditor
            initialName={displayName}
            initialEmoji={avatarEmoji}
            hasPhoto={Boolean(avatarUrl)}
          />
        </div>
      </section>

      <div className="mt-6 text-center">
        <SignOutButton />
      </div>
    </div>
  );
}
