export type AssetKind = "fiat" | "crypto" | "metal";
export type AssetSource = "frankfurter" | "coingecko";

/**
 * A single tradeable asset in the unified model. Fiat, crypto and metals all
 * share this shape so that nothing downstream branches on `kind` except the
 * data layer that assembles USD prices.
 *
 * `id` is namespaced: "fiat:USD" | "crypto:bitcoin" | "metal:XAU".
 */
export interface Asset {
  id: string;
  kind: AssetKind;
  /** Ticker shown in the UI, e.g. "USD", "BTC", "XAU". */
  symbol: string;
  /** Human-readable name, e.g. "US Dollar", "Bitcoin", "Gold (troy oz)". */
  name: string;
  /** Which upstream provides this asset's USD price. */
  source: AssetSource;
  /** The id/code understood by the upstream (Frankfurter code or CoinGecko id). */
  upstreamId: string;
  /** Display precision hint for amounts of this asset. */
  decimals: number;
  /** Metals derive their USD price via a bitcoin vs_currency bridge. */
  bridge?: "bitcoin";
  /** Optional flag/emoji or country hint for nicer selectors. */
  flag?: string;
}
