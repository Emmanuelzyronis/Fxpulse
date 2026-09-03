import type { Asset } from "@/types/asset";
import { makeId } from "./ids";
import { getCurrencies } from "@/lib/api/frankfurter";
import { getTopMarkets } from "@/lib/api/coingecko";
import { cachedFetch, type CachedResult } from "@/lib/api/upstream";

/**
 * The unified asset catalog: fiat (live from Frankfurter), a curated set of
 * major cryptocurrencies, and precious metals (priced via a bitcoin bridge).
 */

/** Display metadata for the ~30 ECB currencies Frankfurter exposes. */
const FIAT_META: Record<string, { decimals: number; flag: string }> = {
  AUD: { decimals: 2, flag: "🇦🇺" },
  BGN: { decimals: 2, flag: "🇧🇬" },
  BRL: { decimals: 2, flag: "🇧🇷" },
  CAD: { decimals: 2, flag: "🇨🇦" },
  CHF: { decimals: 2, flag: "🇨🇭" },
  CNY: { decimals: 2, flag: "🇨🇳" },
  CZK: { decimals: 2, flag: "🇨🇿" },
  DKK: { decimals: 2, flag: "🇩🇰" },
  EUR: { decimals: 2, flag: "🇪🇺" },
  GBP: { decimals: 2, flag: "🇬🇧" },
  HKD: { decimals: 2, flag: "🇭🇰" },
  HUF: { decimals: 0, flag: "🇭🇺" },
  IDR: { decimals: 0, flag: "🇮🇩" },
  ILS: { decimals: 2, flag: "🇮🇱" },
  INR: { decimals: 2, flag: "🇮🇳" },
  ISK: { decimals: 0, flag: "🇮🇸" },
  JPY: { decimals: 0, flag: "🇯🇵" },
  KRW: { decimals: 0, flag: "🇰🇷" },
  MXN: { decimals: 2, flag: "🇲🇽" },
  MYR: { decimals: 2, flag: "🇲🇾" },
  NOK: { decimals: 2, flag: "🇳🇴" },
  NZD: { decimals: 2, flag: "🇳🇿" },
  PHP: { decimals: 2, flag: "🇵🇭" },
  PLN: { decimals: 2, flag: "🇵🇱" },
  RON: { decimals: 2, flag: "🇷🇴" },
  SEK: { decimals: 2, flag: "🇸🇪" },
  SGD: { decimals: 2, flag: "🇸🇬" },
  THB: { decimals: 2, flag: "🇹🇭" },
  TRY: { decimals: 2, flag: "🇹🇷" },
  USD: { decimals: 2, flag: "🇺🇸" },
  ZAR: { decimals: 2, flag: "🇿🇦" },
  EGP: { decimals: 2, flag: "🇪🇬" },
  GHS: { decimals: 2, flag: "🇬🇭" },
  KES: { decimals: 2, flag: "🇰🇪" },
  NGN: { decimals: 2, flag: "🇳🇬" },
  RWF: { decimals: 0, flag: "🇷🇼" },
  TZS: { decimals: 2, flag: "🇹🇿" },
  UGX: { decimals: 0, flag: "🇺🇬" },
  XAF: { decimals: 2, flag: "🇨🇲" },
  XOF: { decimals: 2, flag: "🇸🇳" },
};

/** Curated majors — a stable, hand-picked list (not CoinGecko's /coins/list). */
export const CRYPTO_ASSETS: Asset[] = (
  [
    ["bitcoin", "BTC", "Bitcoin", 6],
    ["ethereum", "ETH", "Ethereum", 6],
    ["tether", "USDT", "Tether", 4],
    ["binancecoin", "BNB", "BNB", 4],
    ["solana", "SOL", "Solana", 4],
    ["ripple", "XRP", "XRP", 4],
    ["usd-coin", "USDC", "USD Coin", 4],
    ["cardano", "ADA", "Cardano", 4],
    ["dogecoin", "DOGE", "Dogecoin", 6],
    ["tron", "TRX", "TRON", 6],
    ["avalanche-2", "AVAX", "Avalanche", 4],
    ["chainlink", "LINK", "Chainlink", 4],
    ["polkadot", "DOT", "Polkadot", 4],
    ["matic-network", "MATIC", "Polygon", 4],
    ["litecoin", "LTC", "Litecoin", 4],
    ["shiba-inu", "SHIB", "Shiba Inu", 10],
    ["bitcoin-cash", "BCH", "Bitcoin Cash", 4],
    ["stellar", "XLM", "Stellar", 6],
    ["uniswap", "UNI", "Uniswap", 4],
    ["monero", "XMR", "Monero", 4],
    ["ethereum-classic", "ETC", "Ethereum Classic", 4],
    ["aptos", "APT", "Aptos", 4],
    ["near", "NEAR", "NEAR Protocol", 4],
    ["filecoin", "FIL", "Filecoin", 4],
    ["arbitrum", "ARB", "Arbitrum", 4],
    ["optimism", "OP", "Optimism", 4],
    ["maker", "MKR", "Maker", 4],
    ["vechain", "VET", "VeChain", 6],
    ["algorand", "ALGO", "Algorand", 4],
    ["the-graph", "GRT", "The Graph", 6],
    ["internet-computer", "ICP", "Internet Computer", 4],
    ["hedera-hashgraph", "HBAR", "Hedera", 6],
    ["cosmos", "ATOM", "Cosmos", 4],
    ["the-open-network", "TON", "Toncoin", 4],
    ["sui", "SUI", "Sui", 4],
    ["dai", "DAI", "Dai", 4],
    ["usd1-wlfi", "USD1", "World Liberty Financial USD", 4],
  ] as const
).map(([upstreamId, symbol, name, decimals]) => ({
  id: makeId("crypto", upstreamId),
  kind: "crypto" as const,
  symbol,
  name,
  source: "coingecko" as const,
  upstreamId,
  decimals,
  flag: "🪙",
}));

/** Precious metals, priced in USD/oz via the bitcoin bridge. */
export const METAL_ASSETS: Asset[] = [
  {
    id: makeId("metal", "XAU"),
    kind: "metal",
    symbol: "XAU",
    name: "Gold (troy oz)",
    source: "coingecko",
    upstreamId: "XAU",
    decimals: 4,
    bridge: "bitcoin",
    flag: "🥇",
  },
  {
    id: makeId("metal", "XAG"),
    kind: "metal",
    symbol: "XAG",
    name: "Silver (troy oz)",
    source: "coingecko",
    upstreamId: "XAG",
    decimals: 4,
    bridge: "bitcoin",
    flag: "🥈",
  },
];

/** Convert a Frankfurter code->name map into fiat Assets. */
export function buildFiatAssets(currencies: Record<string, string>): Asset[] {
  return Object.entries(currencies)
    .map(([code, name]) => {
      const meta = FIAT_META[code] ?? { decimals: 2, flag: "💱" };
      return {
        id: makeId("fiat", code),
        kind: "fiat" as const,
        symbol: code,
        name,
        source: "frankfurter" as const,
        upstreamId: code,
        decimals: meta.decimals,
        flag: meta.flag,
      };
    })
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}

/** Fallback fiat set if Frankfurter's /currencies is unavailable on first load. */
const FALLBACK_FIAT: Record<string, string> = {
  USD: "United States Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  JPY: "Japanese Yen",
  CHF: "Swiss Franc",
  CAD: "Canadian Dollar",
  AUD: "Australian Dollar",
  CNY: "Chinese Yuan",
  INR: "Indian Rupee",
  NGN: "Nigerian Naira",
  GHS: "Ghanaian Cedi",
  KES: "Kenyan Shilling",
  EGP: "Egyptian Pound",
  TZS: "Tanzanian Shilling",
  UGX: "Ugandan Shilling",
  RWF: "Rwandan Franc",
  XOF: "West African CFA Franc",
  XAF: "Central African CFA Franc",
};

export interface Catalog {
  assets: Asset[];
  fiatCount: number;
  asOf: number;
  stale: boolean;
}

/** Assemble the full catalog. Fiat is fetched; crypto/metals are static. */
async function loadCatalog(): Promise<Omit<Catalog, "stale">> {
  let currencies: Record<string, string>;
  try {
    currencies = await getCurrencies();
  } catch {
    currencies = FALLBACK_FIAT;
  }
  const fiat = buildFiatAssets({ ...FALLBACK_FIAT, ...currencies });
  let crypto = CRYPTO_ASSETS;
  try {
    const markets = await getTopMarkets(250);
    const curated = new Map(CRYPTO_ASSETS.map((a) => [a.upstreamId, a]));
    crypto = markets.map((coin) => curated.get(coin.id) ?? {
      id: makeId("crypto", coin.id), kind: "crypto" as const,
      symbol: coin.symbol.toUpperCase(), name: coin.name,
      source: "coingecko" as const, upstreamId: coin.id, decimals: 6, flag: "🪙",
    });
  } catch {
    // Keep the stable curated list when CoinGecko market discovery is limited.
  }
  return {
    assets: [...fiat, ...crypto, ...METAL_ASSETS],
    fiatCount: fiat.length,
    asOf: Date.now(),
  };
}

/** Catalog with a 24h TTL + stale-serve. */
export async function getCatalog(): Promise<Catalog> {
  const result: CachedResult<Omit<Catalog, "stale">> = await cachedFetch(
    "catalog:v1",
    24 * 60 * 60 * 1000,
    loadCatalog,
  );
  return { ...result.value, stale: result.stale };
}
