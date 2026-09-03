import type { AssetSource } from "./asset";

/** One asset's price expressed in USD per 1 unit, plus provenance. */
export interface RateEntry {
  /** USD per 1 unit of this asset. USD itself is exactly 1. */
  usdPrice: number;
  /** 24h percent change, when the source provides it (crypto/metals). */
  change24h?: number;
  source: AssetSource;
  /** Epoch ms of the upstream "as of" time (ECB date, or CoinGecko last_updated_at). */
  asOf: number;
}

/**
 * The unified rate map returned by GET /api/rates. Every requested asset id
 * maps to its USD price, so any cross-rate is `usdPrice[from] / usdPrice[to]`.
 */
export interface UnifiedRates {
  base: "USD";
  rates: Record<string, RateEntry>;
  /** Epoch ms when the server assembled this response. */
  fetchedAt: number;
  /** Asset ids served from stale cache (upstream failed). Empty/undefined = all fresh. */
  partial?: string[];
}
