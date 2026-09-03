export type HistoryRange = "7d" | "30d" | "90d" | "1y" | "ytd";

export const HISTORY_RANGES: HistoryRange[] = ["7d", "30d", "90d", "1y", "ytd"];

export interface HistoryPoint {
  /** UTC calendar day, "YYYY-MM-DD". */
  date: string;
  /** Rate: units of `to` per 1 unit of `from` on that day's close. */
  value: number;
}

export interface HistoryMeta {
  /** Upstream sources that contributed (e.g. ["frankfurter"], ["frankfurter","coingecko"]). */
  sources: string[];
  /** True when gaps were forward-filled (weekends/holidays) or points were missing. */
  hasGaps: boolean;
  /** Epoch ms of the most recent point. */
  asOf: number;
}

/** Daily-close series for one pair, returned by GET /api/history. */
export interface HistorySeries {
  from: string;
  to: string;
  range: HistoryRange;
  points: HistoryPoint[];
  meta: HistoryMeta;
}
