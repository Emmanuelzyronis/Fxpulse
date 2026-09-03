/**
 * Number & currency formatting. Results span a huge magnitude range
 * (JPY ~160, EUR ~0.86, BTC ~77,000, SHIB ~0.00002), so precision is chosen
 * from magnitude unless the user pins a fixed precision.
 */

import { AUTO_PRECISION } from "@/types/settings";

/** Pick a sensible number of decimal places from a value's magnitude. */
export function autoDecimals(value: number): number {
  const abs = Math.abs(value);
  if (abs === 0 || !Number.isFinite(abs)) return 2;
  if (abs >= 1000) return 2;
  if (abs >= 1) return 4;
  if (abs >= 0.01) return 6;
  // Very small values: show ~4 significant figures after the leading zeros.
  const leadingZeros = Math.floor(-Math.log10(abs));
  return Math.min(12, leadingZeros + 4);
}

export interface FormatOptions {
  /** Fixed decimals, or AUTO_PRECISION (default) to derive from magnitude. */
  precision?: number;
  /** Currency/asset symbol to suffix, e.g. "EUR". */
  symbol?: string;
  /** Group thousands. Default true. */
  grouping?: boolean;
}

/** Format a numeric amount for display. */
export function formatAmount(value: number, opts: FormatOptions = {}): string {
  const { precision = AUTO_PRECISION, symbol, grouping = true } = opts;
  if (!Number.isFinite(value)) return "—";
  const decimals = precision === AUTO_PRECISION ? autoDecimals(value) : precision;
  const formatted = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: Math.min(decimals, 2) === decimals ? decimals : 0,
    maximumFractionDigits: decimals,
    useGrouping: grouping,
  }).format(value);
  return symbol ? `${formatted} ${symbol}` : formatted;
}

/** Compact rate line, e.g. "1 USD = 0.8631 EUR". */
export function formatRateLine(
  rate: number,
  fromSymbol: string,
  toSymbol: string,
): string {
  return `1 ${fromSymbol} = ${formatAmount(rate)} ${toSymbol}`;
}

/** Signed percent, e.g. "+1.24%" / "-0.30%". */
export function formatPercent(pct: number, decimals = 2): string {
  if (!Number.isFinite(pct)) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(decimals)}%`;
}

/** Parse a user-typed amount, tolerating grouping separators and blanks. */
export function parseAmount(input: string): number {
  if (typeof input !== "string") return NaN;
  const cleaned = input.trim().replace(/[,\s_]/g, "");
  if (cleaned === "") return NaN;
  return Number(cleaned);
}
