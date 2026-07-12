import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { computeStreak, todayBangkok } from "@/lib/streak";
import ProfileEditor from "@/components/ProfileEditor";
import SignOutButton from "@/components/SignOutButton";
import {
  IconBook,
  IconCheck,
  IconFlame,
  IconNews,
  IconPencil,
  IconStar,
} from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata = { title: "Profile — InTouch" };

const DAY_MS = 86_400_000;

function lastSevenDays(today: string): string[] {
  const end = Date.parse(`${today}T00:00:00Z`);
  return Array.from({ length: 7 }, (_, i) =>
    new Date(end - (6 - i) * DAY_MS).toISOString().slice(0, 10)
  );
}

export default async function ProfilePage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const db = supabase();
  const [readsRes, vocabRes] = await Promise.all([
    db.from("article_reads").select("read_date").eq("user_id", user.id),
    db.from("vocab_bank").select("favorite, review_count").eq("user_id", user.id),
  ]);

  const readDates = (readsRes.data ?? []).map((r) => r.read_date as string);
  const today = todayBangkok();
  const { streak, readToday } = computeStreak(readDates, today);
  const readDaySet = new Set(readDates);
  const week = lastSevenDays(today);

  const vocab = vocabRes.data ?? [];
  const stats = [
    { icon: IconFlame, value: streak, label: "day streak" },
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
              className="h-20 w-20 rounded-3xl object-cover shadow-lg"
            />
          ) : (
            <span className="glass flex h-20 w-20 items-center justify-center rounded-3xl text-4xl shadow-lg">
              {avatarEmoji}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold tracking-tight text-neutral-950 sm:text-3xl">
              {displayName}
            </h1>
            <p className="mt-1 truncate text-sm text-neutral-500">{user.email}</p>
            <p className="mt-0.5 text-xs text-neutral-400">Reading since {memberSince}</p>
          </div>
        </div>

        {/* Last 7 days of reading */}
        <div className="mt-6">
          <div className="flex items-baseline justify-between text-xs font-medium">
            <span className="uppercase tracking-wider text-neutral-400">This week</span>
            <span className="text-neutral-500">
              {readToday ? "Today's read is in — streak safe ✓" : "Read one story to keep your streak"}
            </span>
          </div>
          <div className="mt-2.5 flex gap-2">
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
        </div>
      </section>

      {/* Stats */}
      <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
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
