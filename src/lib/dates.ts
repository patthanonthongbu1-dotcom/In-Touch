const TIME_ZONE = "Asia/Bangkok";

/** "05:04" — time of day in Bangkok time. */
export function formatTimeBangkok(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** "11 Jul, 05:04" — short date + time in Bangkok time. */
export function formatDateTimeBangkok(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
