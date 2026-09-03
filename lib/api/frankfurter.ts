import { fetchJson } from "./upstream";

/**
 * Frankfurter client — keyless ECB reference rates (fiat only).
 * Business-days only: weekends/holidays have no fixing.
 */

const BASE = process.env.FRANKFURTER_BASE_URL ?? "https://api.frankfurter.dev/v1";
const BROAD_BASE = "https://open.er-api.com/v6/latest";

export interface FrankfurterLatest {
  amount: number;
  base: string;
  date: string; // "YYYY-MM-DD"
  rates: Record<string, number>;
}

export interface FrankfurterTimeSeries {
  amount: number;
  base: string;
  start_date: string;
  end_date: string;
  rates: Record<string, Record<string, number>>; // date -> { symbol -> rate }
}

/** Map of ISO code -> currency name for the ~30 ECB currencies. */
export async function getCurrencies(): Promise<Record<string, string>> {
  return fetchJson<Record<string, string>>(`${BASE}/currencies`);
}

/** Latest fixing: amount of each `symbol` per 1 `base`. */
export async function getLatest(
  base: string,
  symbols: string[],
): Promise<FrankfurterLatest> {
  try {
    const broad = await fetchJson<{ base_code: string; time_last_update_unix?: number; rates: Record<string, number> }>(`${BROAD_BASE}/${encodeURIComponent(base)}`);
    const wanted = symbols.filter((s) => s !== base);
    const rates = Object.fromEntries(wanted.filter((s) => broad.rates[s] != null).map((s) => [s, broad.rates[s]]));
    return { amount: 1, base: broad.base_code, date: new Date((broad.time_last_update_unix ?? Date.now() / 1000) * 1000).toISOString().slice(0, 10), rates };
  } catch {
    // Fall back to ECB data if the broad free endpoint is unavailable.
  }
  const params = new URLSearchParams({ base });
  const wanted = symbols.filter((s) => s !== base);
  if (wanted.length) params.set("symbols", wanted.join(","));
  return fetchJson<FrankfurterLatest>(`${BASE}/latest?${params.toString()}`);
}

/** Daily-close time series over [start, end], nested by date. */
export async function getTimeSeries(
  base: string,
  symbols: string[],
  start: string,
  end: string,
): Promise<FrankfurterTimeSeries> {
  const params = new URLSearchParams({ base });
  const wanted = symbols.filter((s) => s !== base);
  if (wanted.length) params.set("symbols", wanted.join(","));
  return fetchJson<FrankfurterTimeSeries>(
    `${BASE}/${start}..${end}?${params.toString()}`,
  );
}
