import type { HistoryPoint } from "@/types/history";
import { toUtcDay } from "@/lib/format/date";
import type { FrankfurterTimeSeries } from "@/lib/api/frankfurter";

/**
 * Pure helpers for building a combined daily-close series for any pair.
 *
 * Everything is expressed as a per-day USD price for each leg
 * (usdPrice = USD per 1 unit), then the pair value for a day is
 * usdPrice[from] / usdPrice[to] — the same USD-hub formula as spot rates.
 */

/** Collapse timestamped points to the last value seen per UTC day. */
export function bucketByUtcDay(points: [number, number][]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [ms, v] of points) {
    if (!Number.isFinite(v)) continue;
    out[toUtcDay(ms)] = v; // later points overwrite → last-per-day close
  }
  return out;
}

/** Forward-fill a sparse day->value map across an ordered `days` axis. */
export function forwardFill(
  days: string[],
  sparse: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  let last: number | undefined;
  for (const d of days) {
    if (sparse[d] !== undefined) last = sparse[d];
    if (last !== undefined) out[d] = last;
  }
  return out;
}

/**
 * Per-day USD price for a fiat leg from a Frankfurter base=USD time series.
 * The series holds "code per USD", so usdPrice(code) = 1 / (code per USD).
 * USD itself is constant 1 across `days`.
 */
export function fiatUsdByDay(
  ts: FrankfurterTimeSeries | null,
  code: string,
  days: string[],
): Record<string, number> {
  if (code === "USD") {
    return Object.fromEntries(days.map((d) => [d, 1]));
  }
  const out: Record<string, number> = {};
  if (!ts) return out;
  for (const [date, rec] of Object.entries(ts.rates)) {
    const perUsd = rec[code];
    if (perUsd && perUsd > 0) out[date] = 1 / perUsd;
  }
  return out;
}

export interface CombineResult {
  points: HistoryPoint[];
  hasGaps: boolean;
}

/**
 * Combine two per-day USD-price legs into a pair series (units of `to` per
 * `from`) over the shared `days` axis. Both legs are forward-filled; a day is
 * flagged as a gap when either leg had no raw value for it.
 */
export function combineUsdSeries(
  fromUsd: Record<string, number>,
  toUsd: Record<string, number>,
  days: string[],
): CombineResult {
  const ffFrom = forwardFill(days, fromUsd);
  const ffTo = forwardFill(days, toUsd);
  const points: HistoryPoint[] = [];
  let hasGaps = false;

  for (const d of days) {
    const f = ffFrom[d];
    const t = ffTo[d];
    if (f === undefined || t === undefined || t === 0) {
      hasGaps = true;
      continue;
    }
    if (fromUsd[d] === undefined || toUsd[d] === undefined) {
      hasGaps = true; // value present only via forward-fill
    }
    points.push({ date: d, value: f / t });
  }
  return { points, hasGaps };
}
