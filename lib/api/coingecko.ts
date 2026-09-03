import { fetchJson, type FetchOptions } from "./upstream";

/**
 * CoinGecko client — keyless public API for crypto and (via a bitcoin bridge)
 * precious metals. Rate-limited; the caller adds TTL caching + backoff.
 *
 * A CoinGecko Demo key, if provided, is sent as the `x-cg-demo-api-key` header
 * against the same public host and raises the rate ceiling.
 */

const BASE = process.env.COINGECKO_BASE_URL ?? "https://api.coingecko.com/api/v3";
const DEMO_KEY = process.env.COINGECKO_DEMO_API_KEY;

function authOpts(): FetchOptions {
  return DEMO_KEY ? { headers: { "x-cg-demo-api-key": DEMO_KEY } } : {};
}

export interface SimplePriceEntry {
  usd?: number;
  usd_24h_change?: number;
  xau?: number;
  xag?: number;
  last_updated_at?: number; // epoch seconds
}

export type SimplePriceResponse = Record<string, SimplePriceEntry>;

export interface MarketAsset {
  id: string;
  symbol: string;
  name: string;
}

export async function getTopMarkets(perPage = 250): Promise<MarketAsset[]> {
  const params = new URLSearchParams({
    vs_currency: "usd",
    order: "market_cap_desc",
    per_page: String(perPage),
    page: "1",
    sparkline: "false",
  });
  return fetchJson<Array<{ id: string; symbol: string; name: string }>>(
    `${BASE}/coins/markets?${params.toString()}`,
    authOpts(),
  );
}

export interface MarketChartResponse {
  prices: [number, number][]; // [epochMs, price]
  market_caps?: [number, number][];
  total_volumes?: [number, number][];
}

/**
 * Batched spot prices for coin `ids` in the given `vsCurrencies`
 * (e.g. ["usd","xau","xag"]), with 24h change and last-updated timestamps.
 */
export async function getSimplePrice(
  ids: string[],
  vsCurrencies: string[],
): Promise<SimplePriceResponse> {
  if (ids.length === 0) return {};
  const params = new URLSearchParams({
    ids: ids.join(","),
    vs_currencies: vsCurrencies.join(","),
    include_24hr_change: "true",
    include_last_updated_at: "true",
  });
  return fetchJson<SimplePriceResponse>(
    `${BASE}/simple/price?${params.toString()}`,
    authOpts(),
  );
}

/** Price series for one coin over `days` (auto granularity on the free tier). */
export async function getMarketChart(
  id: string,
  vsCurrency: string,
  days: number,
): Promise<MarketChartResponse> {
  const params = new URLSearchParams({
    vs_currency: vsCurrency,
    days: String(days),
  });
  return fetchJson<MarketChartResponse>(
    `${BASE}/coins/${encodeURIComponent(id)}/market_chart?${params.toString()}`,
    authOpts(),
  );
}
