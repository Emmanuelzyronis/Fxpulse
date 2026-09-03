import type { HistoryPoint } from "@/types/history";

/**
 * Client-side normalization for overlaying multiple pairs on one chart.
 *
 * Pairs live on wildly different scales (JPY ~160, EUR ~0.86, BTC ~77,000), so
 * absolute overlay is meaningless. `index100` rebases each series to 100 at its
 * first point; `pct` shows percent change from the first point. `absolute` is
 * used for a single series.
 */
export type NormalizeMode = "absolute" | "index100" | "pct";

export interface NamedSeries {
  id: string;
  label: string;
  points: HistoryPoint[];
}

export interface MergedRow {
  date: string;
  [seriesId: string]: number | string;
}

export interface NormalizedChart {
  rows: MergedRow[];
  seriesIds: string[];
}

/** Sorted union of all dates across the given series. */
function unionDates(series: NamedSeries[]): string[] {
  const set = new Set<string>();
  for (const s of series) for (const p of s.points) set.add(p.date);
  return Array.from(set).sort();
}

function transform(value: number, first: number, mode: NormalizeMode): number {
  if (mode === "absolute" || !Number.isFinite(first) || first === 0) return value;
  if (mode === "index100") return (value / first) * 100;
  return (value / first - 1) * 100; // pct
}

/**
 * Merge series into a single row-per-date dataset suitable for Recharts, with
 * each series forward-filled onto the shared date axis and transformed by mode.
 */
export function normalizeSeries(
  series: NamedSeries[],
  mode: NormalizeMode,
): NormalizedChart {
  const dates = unionDates(series);
  const seriesIds = series.map((s) => s.id);

  // Precompute a forward-filled lookup and each series' first (baseline) value.
  const filled = new Map<string, Map<string, number>>();
  const firsts = new Map<string, number>();

  for (const s of series) {
    const byDate = new Map(s.points.map((p) => [p.date, p.value]));
    const ff = new Map<string, number>();
    let last: number | undefined;
    let first: number | undefined;
    for (const d of dates) {
      if (byDate.has(d)) last = byDate.get(d);
      if (last !== undefined) {
        ff.set(d, last);
        if (first === undefined) first = last;
      }
    }
    filled.set(s.id, ff);
    if (first !== undefined) firsts.set(s.id, first);
  }

  const rows: MergedRow[] = dates.map((date) => {
    const row: MergedRow = { date };
    for (const s of series) {
      const v = filled.get(s.id)?.get(date);
      if (v !== undefined) {
        row[s.id] = transform(v, firsts.get(s.id) ?? v, mode);
      }
    }
    return row;
  });

  return { rows, seriesIds };
}

/** Convenience: percent change from first to last point of a single series. */
export function seriesChangePct(points: HistoryPoint[]): number {
  if (points.length < 2) return 0;
  const first = points[0].value;
  const last = points[points.length - 1].value;
  if (!Number.isFinite(first) || first === 0) return 0;
  return (last / first - 1) * 100;
}
