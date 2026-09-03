import type { UnifiedRates, RateEntry } from "@/types/rates";
import { parseId } from "@/lib/assets/ids";
import { getLatest } from "@/lib/api/frankfurter";
import { getSimplePrice } from "@/lib/api/coingecko";
import { cachedFetch } from "@/lib/api/upstream";

/**
 * Assemble a unified USD-hub rate map for a mixed set of asset ids.
 *
 * Groups ids by source and makes at most two upstream calls:
 *   - one Frankfurter /latest?base=USD covering all fiat legs
 *   - one CoinGecko /simple/price covering all crypto legs (+ bitcoin, when a
 *     metal is requested, to bridge XAU/XAG)
 *
 * Each source is cached with its own TTL so fiat (daily ECB close) and crypto
 * (minute-fresh) age independently. Legs that could not be priced — or were
 * served stale after an upstream failure — are listed in `partial`.
 */

const FIAT_TTL_MS = 60 * 60 * 1000; // 1h — ECB fixes once per business day
const CRYPTO_TTL_MS = 60 * 1000; // 60s — crypto moves continuously

export async function assembleRates(ids: string[]): Promise<UnifiedRates> {
  const uniq = Array.from(new Set(ids));
  const parsed = uniq.map((id) => ({ id, ...parseId(id) }));

  const fiat = parsed.filter((p) => p.kind === "fiat");
  const crypto = parsed.filter((p) => p.kind === "crypto");
  const metal = parsed.filter((p) => p.kind === "metal");

  const rates: Record<string, RateEntry> = {};
  const partial = new Set<string>();

  // --- Fiat via Frankfurter (base = USD) ---
  if (fiat.length) {
    const symbols = fiat.map((p) => p.upstreamId).filter((s) => s !== "USD");
    let latest: Awaited<ReturnType<typeof getLatest>> | null = null;
    let stale = false;
    let at = Date.now();

    if (symbols.length) {
      const key = `rates:fiat:${[...symbols].sort().join(",")}`;
      const res = await cachedFetch(key, FIAT_TTL_MS, () => getLatest("USD", symbols));
      latest = res.value;
      stale = res.stale;
      at = res.at;
    }

    const asOf = latest ? fromDateOrNow(latest.date, at) : at;
    for (const p of fiat) {
      if (p.upstreamId === "USD") {
        rates[p.id] = { usdPrice: 1, source: "frankfurter", asOf };
        continue;
      }
      const perUsd = latest?.rates?.[p.upstreamId];
      if (perUsd && perUsd > 0) {
        rates[p.id] = { usdPrice: 1 / perUsd, source: "frankfurter", asOf };
        if (stale) partial.add(p.id);
      } else {
        partial.add(p.id);
      }
    }
  }

  // --- Crypto + metals via CoinGecko ---
  if (crypto.length || metal.length) {
    const coinIds = crypto.map((p) => p.upstreamId);
    const needBtcBridge = metal.length > 0;
    const callIds = Array.from(new Set([...coinIds, ...(needBtcBridge ? ["bitcoin"] : [])]));
    const vs = ["usd", ...(needBtcBridge ? ["xau", "xag"] : [])];

    let price: Awaited<ReturnType<typeof getSimplePrice>> = {};
    let stale = false;
    let at = Date.now();
    let failed = false;

    if (callIds.length) {
      const key = `rates:cg:${[...callIds].sort().join(",")}:${vs.join(",")}`;
      try {
        const res = await cachedFetch(key, CRYPTO_TTL_MS, () => getSimplePrice(callIds, vs));
        price = res.value;
        stale = res.stale;
        at = res.at;
      } catch {
        failed = true; // no upstream data and nothing cached
      }
    }

    for (const p of crypto) {
      const entry = price[p.upstreamId];
      if (!failed && entry?.usd && entry.usd > 0) {
        rates[p.id] = {
          usdPrice: entry.usd,
          change24h: entry.usd_24h_change,
          source: "coingecko",
          asOf: entry.last_updated_at ? entry.last_updated_at * 1000 : at,
        };
        if (stale) partial.add(p.id);
      } else {
        partial.add(p.id);
      }
    }

    const btc = price["bitcoin"];
    for (const p of metal) {
      // CoinGecko gives bitcoin priced in the metal, i.e. troy-oz per 1 BTC.
      // USD per oz = (USD per BTC) / (oz per BTC).
      const ozPerBtc = p.upstreamId === "XAU" ? btc?.xau : btc?.xag;
      if (!failed && btc?.usd && ozPerBtc && ozPerBtc > 0) {
        rates[p.id] = {
          usdPrice: btc.usd / ozPerBtc,
          source: "coingecko",
          asOf: btc.last_updated_at ? btc.last_updated_at * 1000 : at,
        };
        if (stale) partial.add(p.id);
      } else {
        partial.add(p.id);
      }
    }
  }

  return {
    base: "USD",
    rates,
    fetchedAt: Date.now(),
    partial: partial.size ? Array.from(partial) : undefined,
  };
}

function fromDateOrNow(day: string, fallback: number): number {
  const t = Date.parse(`${day}T00:00:00.000Z`);
  return Number.isFinite(t) ? t : fallback;
}
