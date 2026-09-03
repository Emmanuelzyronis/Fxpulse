/** Date helpers. All history bucketing is done on UTC calendar days. */

const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" for the UTC day containing `epochMs` (or a Date). */
export function toUtcDay(epochMs: number | Date): string {
  const d = typeof epochMs === "number" ? new Date(epochMs) : epochMs;
  return d.toISOString().slice(0, 10);
}

/** Epoch ms at UTC midnight of a "YYYY-MM-DD" string. */
export function fromUtcDay(day: string): number {
  return Date.parse(`${day}T00:00:00.000Z`);
}

/** Days between two "YYYY-MM-DD" strings (b - a). */
export function dayDiff(a: string, b: string): number {
  return Math.round((fromUtcDay(b) - fromUtcDay(a)) / DAY_MS);
}

/** Inclusive list of UTC day strings from `start` to `end`. */
export function eachUtcDay(start: string, end: string): string[] {
  const out: string[] = [];
  let t = fromUtcDay(start);
  const endT = fromUtcDay(end);
  while (t <= endT) {
    out.push(toUtcDay(t));
    t += DAY_MS;
  }
  return out;
}

/** Start "YYYY-MM-DD" for a given range relative to `now` (default today, UTC). */
export function rangeStart(range: string, now: number = Date.now()): string {
  const today = new Date(now);
  const y = today.getUTCFullYear();
  switch (range) {
    case "7d":
      return toUtcDay(now - 7 * DAY_MS);
    case "30d":
      return toUtcDay(now - 30 * DAY_MS);
    case "90d":
      return toUtcDay(now - 90 * DAY_MS);
    case "1y":
      return toUtcDay(now - 365 * DAY_MS);
    case "ytd":
      return `${y}-01-01`;
    default:
      return toUtcDay(now - 30 * DAY_MS);
  }
}

/** Locale date-time string for log/detail views. */
export function formatDateTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Short relative "as of" label, e.g. "just now", "3m ago", "2h ago". */
export function relativeTime(epochMs: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - epochMs);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
