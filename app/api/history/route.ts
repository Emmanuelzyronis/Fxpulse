import { NextResponse, type NextRequest } from "next/server";
import { parseId, isAssetId } from "@/lib/assets/ids";
import { getTimeSeries, type FrankfurterTimeSeries } from "@/lib/api/frankfurter";
import { getMarketChart } from "@/lib/api/coingecko";
import { cachedFetch } from "@/lib/api/upstream";
import { rangeStart, toUtcDay, eachUtcDay } from "@/lib/format/date";
import { bucketByUtcDay, fiatUsdByDay, combineUsdSeries } from "@/lib/history/combine";
import { HISTORY_RANGES, type HistoryRange, type HistorySeries } from "@/types/history";

export const dynamic = "force-dynamic";

const FIAT_HISTORY_TTL_MS = 60 * 60 * 1000; // 1h
const CRYPTO_HISTORY_TTL_MS = 10 * 60 * 1000; // 10m — keep the latest point fresh

/**
 * GET /api/history?from=<id>&to=<id>&range=7d|30d|90d|1y|ytd
 * Daily-close series (units of `to` per `from`) built on the USD hub.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";
  const range = (sp.get("range") ?? "30d") as HistoryRange;

  if (!isAssetId(from) || !isAssetId(to)) {
    return NextResponse.json({ error: "invalid_pair" }, { status: 400 });
  }
  if (!HISTORY_RANGES.includes(range)) {
    return NextResponse.json({ error: "invalid_range" }, { status: 400 });
  }

  const now = Date.now();
  const startDay = rangeStart(range, now);
  const endDay = toUtcDay(now);
  const days = eachUtcDay(startDay, endDay);
  const daysCount = Math.max(1, days.length);

  const sources = new Set<string>();
  let stale = false;

  // Batch all fiat legs into one Frankfurter time-series call (base = USD).
  const legIds = [from, to];
  const fiatCodes = Array.from(
    new Set(
      legIds
        .map((id) => parseId(id))
        .filter((p) => p.kind === "fiat")
        .map((p) => p.upstreamId),
    ),
  );
  const nonUsdFiat = fiatCodes.filter((c) => c !== "USD");

  let ts: FrankfurterTimeSeries | null = null;
  if (nonUsdFiat.length) {
    const key = `hist:fiat:${[...nonUsdFiat].sort().join(",")}:${startDay}:${endDay}`;
    const res = await cachedFetch(key, FIAT_HISTORY_TTL_MS, () =>
      getTimeSeries("USD", nonUsdFiat, startDay, endDay),
    );
    ts = res.value;
    stale = stale || res.stale;
    sources.add("frankfurter");
  } else if (fiatCodes.length) {
    sources.add("frankfurter"); // USD-only leg needs no call (constant 1)
  }

  const usdByDay = async (id: string): Promise<Record<string, number>> => {
    const { kind, upstreamId } = parseId(id);

    if (kind === "fiat") {
      return fiatUsdByDay(ts, upstreamId, days);
    }

    if (kind === "crypto") {
      const key = `hist:cg:${upstreamId}:usd:${daysCount}`;
      const res = await cachedFetch(key, CRYPTO_HISTORY_TTL_MS, () =>
        getMarketChart(upstreamId, "usd", daysCount),
      );
      stale = stale || res.stale;
      sources.add("coingecko");
      return bucketByUtcDay(res.value.prices); // USD per coin
    }

    // metal — bridge through bitcoin priced in both usd and the metal.
    const vs = upstreamId === "XAU" ? "xau" : "xag";
    const key = `hist:cg:bitcoin:usd+${vs}:${daysCount}`;
    const res = await cachedFetch(key, CRYPTO_HISTORY_TTL_MS, async () => {
      const [usdChart, metalChart] = await Promise.all([
        getMarketChart("bitcoin", "usd", daysCount),
        getMarketChart("bitcoin", vs, daysCount),
      ]);
      return { usdChart, metalChart };
    });
    stale = stale || res.stale;
    sources.add("coingecko");

    const btcUsd = bucketByUtcDay(res.value.usdChart.prices); // USD per BTC
    const btcMetal = bucketByUtcDay(res.value.metalChart.prices); // oz per BTC
    const out: Record<string, number> = {};
    for (const [day, usd] of Object.entries(btcUsd)) {
      const oz = btcMetal[day];
      if (oz && oz > 0) out[day] = usd / oz; // USD per oz
    }
    return out;
  };

  let fromUsd: Record<string, number>;
  let toUsd: Record<string, number>;
  try {
    [fromUsd, toUsd] = await Promise.all([usdByDay(from), usdByDay(to)]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "history_unavailable";
    return NextResponse.json({ error: "history_unavailable", message }, { status: 502 });
  }

  const { points, hasGaps } = combineUsdSeries(fromUsd, toUsd, days);
  const asOf = points.length ? Date.parse(`${points[points.length - 1].date}T00:00:00Z`) : now;

  const body: HistorySeries = {
    from,
    to,
    range,
    points,
    meta: { sources: Array.from(sources), hasGaps, asOf },
  };

  // Cache longer for longer ranges; short ranges want the latest point fresher.
  const sMaxAge = range === "7d" ? 300 : 900;
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": `s-maxage=${sMaxAge}, stale-while-revalidate=3600`,
    },
  });
}
