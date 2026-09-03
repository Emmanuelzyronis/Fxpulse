import type { UnifiedRates } from "@/types/rates";

/**
 * USD-hub conversion math. Every asset carries a `usdPrice` (USD per 1 unit),
 * so one formula covers fiat, crypto and metals in any combination:
 *
 *   rate(from -> to) = usdPrice[from] / usdPrice[to]   (units of `to` per 1 `from`)
 *   convert(amount)  = amount * rate
 *
 * These functions are pure and are the correctness core of the app.
 */

export class MissingRateError extends Error {
  constructor(public readonly id: string) {
    super(`Missing USD price for asset "${id}"`);
    this.name = "MissingRateError";
  }
}

/** USD per 1 unit of `id`. Throws MissingRateError if unavailable. */
export function usdPriceOf(id: string, rates: UnifiedRates): number {
  const entry = rates.rates[id];
  if (!entry || !Number.isFinite(entry.usdPrice) || entry.usdPrice <= 0) {
    throw new MissingRateError(id);
  }
  return entry.usdPrice;
}

/** Units of `to` per 1 unit of `from`. */
export function rateOf(fromId: string, toId: string, rates: UnifiedRates): number {
  if (fromId === toId) return 1;
  const from = usdPriceOf(fromId, rates);
  const to = usdPriceOf(toId, rates);
  return from / to;
}

/** Convert `amount` units of `from` into units of `to`. */
export function convert(
  amount: number,
  fromId: string,
  toId: string,
  rates: UnifiedRates,
): number {
  if (!Number.isFinite(amount)) return NaN;
  return amount * rateOf(fromId, toId, rates);
}

/** Whether both legs of a pair have a usable USD price in `rates`. */
export function canConvert(fromId: string, toId: string, rates: UnifiedRates): boolean {
  try {
    usdPriceOf(fromId, rates);
    usdPriceOf(toId, rates);
    return true;
  } catch {
    return false;
  }
}
