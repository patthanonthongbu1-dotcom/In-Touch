const DAY_MS = 86_400_000;

/** Today's date as "YYYY-MM-DD" in Bangkok time. */
export function todayBangkok(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

/**
 * Reading streak: consecutive Bangkok calendar days with at least one read,
 * counting back from today. A day without reading only breaks the streak
 * once it's over — until then yesterday's streak still shows.
 */
export function computeStreak(
  readDates: Iterable<string>,
  today: string = todayBangkok()
): { streak: number; readToday: boolean } {
  const days = new Set(readDates);
  const readToday = days.has(today);

  let cursor = Date.parse(`${today}T00:00:00Z`);
  if (!readToday) cursor -= DAY_MS; // grace: today isn't lost yet

  let streak = 0;
  while (days.has(new Date(cursor).toISOString().slice(0, 10))) {
    streak++;
    cursor -= DAY_MS;
  }
  return { streak, readToday };
}
