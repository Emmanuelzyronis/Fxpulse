# FXPulse

A currency converter that treats fiat, crypto, and precious metals as one thing. Live rates, a history chart with multi-pair overlays, favorite pairs, a conversion log, and **rate alerts** that tell you the moment a rate crosses the level you're watching for — all with no API key and no account.

Built with Next.js 16 (App Router), React 19, and TypeScript. State lives in your browser; nothing is sent to a server we run.

---

## Features

- **Unified conversion** — fiat ↔ crypto ↔ metal through one USD-hub formula. USD/EUR, BTC/JPY, and XAU/GBP all work the same way.
- **Broad asset catalog** — ECB fiat currencies, major crypto assets including BTC, ETH, USDT, USDC, SOL, TON, SUI, DAI and more, plus gold and silver.
- **Responsive home screen** — the converter adapts from a two-column desktop layout to a stacked, touch-friendly mobile layout without clipped amounts or selectors.
- **Rate alerts** — set a target and direction ("rises to" / "falls to"); FXPulse watches the rate and fires an in-app toast plus a browser notification (if you allow it). One-shot by default, or repeating with anti-flap hysteresis so it won't spam you while a rate hovers on the line.
- **History charts** — 7d / 30d / 90d / 1y / YTD on daily close, overlay several pairs at once, and normalize with index-to-100 or %Δ so pairs on wildly different scales line up.
- **Comparison grid** — fan one amount out to many targets, each with a sparkline and trend.
- **Favorites** — pin pairs, drag to reorder, persisted across reloads.
- **Conversion log** — every conversion recorded, searchable/filterable, with CSV export.
- **Honest data UX** — per-source "as of" and stale badges, retry on error, and last-good values served instead of hard failures.

## Quick start

```bash
npm install
npm run dev
# open http://localhost:3000
```

No environment variables are required — the app runs against the free, keyless public APIs out of the box.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run test` | Run the test suite once (Vitest) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## Configuration

Everything is optional. Copy `.env.example` to `.env.local` if you want to override anything:

| Variable | Default | Purpose |
|---|---|---|
| `COINGECKO_DEMO_API_KEY` | _(none)_ | A CoinGecko **Demo** key raises the crypto rate-limit ceiling. Sent as `x-cg-demo-api-key`. |
| `COINGECKO_BASE_URL` | `https://api.coingecko.com/api/v3` | Override the CoinGecko host (testing). |
| `FRANKFURTER_BASE_URL` | `https://api.frankfurter.dev/v1` | Override the Frankfurter host (testing). |

## How it works

**Data sources (zero key):**
- **Frankfurter** — ECB reference rates for ~30 fiat currencies, plus daily-close history. The available fiat list is limited to currencies provided by this upstream; currencies such as NGN need a provider that publishes those rates.
- **CoinGecko** (public API) — crypto spot prices and history. Gold (`XAU`) and silver (`XAG`) are derived through a bitcoin bridge (`btc.usd / btc.xau`), so no metals feed or token is needed.

Both are proxied through Next.js route handlers (`/api/assets`, `/api/rates`, `/api/history`) for caching, CORS, and rate-limit protection.

**The USD-hub principle.** Every asset carries a `usdPrice` (USD per 1 unit). One formula covers every pair:

```
rateOf(from, to) = usdPrice[from] / usdPrice[to]   // units of `to` per 1 `from`
convert(amount, from, to) = amount * rateOf(from, to)
```

Assets are addressed by namespaced ids — `fiat:USD`, `crypto:bitcoin`, `metal:XAU` — and nothing else in the app branches on asset type.

**Caching.** `/api/rates` batches all requested assets into **one** Frankfurter call and **one** CoinGecko call. Fiat is cached for 1h (ECB fixes once per business day); crypto for 60s. Responses carry `Cache-Control: s-maxage=60, stale-while-revalidate=300`. On an upstream failure the layer serves the last-good value and flags it, rather than returning an error.

**Alerts are client-only.** A single `<AlertEngine/>` polls `/api/rates` on an interval (default 60s, floor 30s) while a FXPulse tab is open, with immediate catch-up checks when the tab regains focus or the network comes back. Fired alerts persist their `triggeredAt`, so reloading never re-fires them.

## Project structure

```
app/
  page.tsx                 Converter (home)
  compare/ charts/ favorites/ log/ alerts/   feature routes
  api/assets|rates|history/route.ts          caching proxies
  providers.tsx            Query client, stores hydration gate, AlertEngine
components/  common/ layout/ converter/ chart/ compare/ favorites/ log/ alerts/
lib/
  api/         frankfurter, coingecko, upstream (fetch + backoff)
  rates/       convert (USD-hub math), normalize (assemble + cache)
  history/     combine (daily-close series), normalizeSeries (overlays)
  assets/      catalog, ids
  alerts/      evaluate (fire / rearm / none)
  format/      number, date        csv        storage/persist (safe localStorage)
hooks/   useAssets useRates useHistory useConversion useAlertEngine useHasHydrated
stores/  settings favorites log alerts   (Zustand + persist)
types/   asset rates history favorites log alerts settings
```

**State & persistence** — Zustand stores persisted to `localStorage` (`fxpulse:settings`, `fxpulse:favorites`, `fxpulse:log`, `fxpulse:alerts`), each versioned for migration. Remote data (rates/history) lives in the TanStack Query cache. Stores hydrate behind a `useHasHydrated` gate to avoid SSR mismatch; persisted UI shows skeletons until ready.

## Testing

```bash
npm run test
```

Vitest + Testing Library + jsdom, with MSW for route-handler fixtures. Coverage focuses on the bug-prone core:

- `lib/rates/convert` — triangulation, `rate × inverse ≈ 1`, extreme magnitudes, missing-rate errors.
- `lib/alerts/evaluate` — firing thresholds, one-shot de-dupe, repeat hysteresis.
- `lib/history/combine` & `normalizeSeries` — UTC-day bucketing, weekend forward-fill, gap flagging, index-100/%Δ.
- `lib/format/*`, `lib/csv`, `lib/storage/persist` — formatting, CSV quoting, storage guards.

## Limitations

These are real constraints of a keyless, client-only build — worth knowing before you rely on a number:

1. **CoinGecko rate limits.** The keyless public API is modest. Mitigated by one-call batching, a 60s cache, backoff, and stale-serve. A CoinGecko Demo key raises the ceiling.
2. **Frankfurter is daily ECB close, business days only.** Weekends and holidays have no fixing — fiat is "last close," not live or intraday, and history has weekend gaps (forward-filled on charts).
3. **Metals are indicative.** `XAU`/`XAG` come through a bitcoin bridge, not a dealing feed — usable for tracking, not for trading (silver is noisier).
4. **No candlesticks.** Neither source offers free OHLC/intraday for both worlds, so charts are line/area on daily close. The "advanced charts" value is in timeframes, multi-pair overlays, and %Δ normalization instead.
5. **Alerts need an open tab.** There's no service worker or server push, so alerts can't fire while FXPulse is closed and checks slow down when the tab is in the background. This is stated in the app, not hidden.
6. **Local only.** State is in `localStorage` (~5MB; the log is ring-buffered to ~1000 entries) with no cross-device sync. Accounts/sync and PWA/offline are future work.
7. **Timezones.** ECB publishes in CET, CoinGecko in UTC. FXPulse stores epoch-ms UTC, buckets history by UTC day, and formats only at the edge.

## License

Personal/educational project. Rate data belongs to Frankfurter (ECB) and CoinGecko under their respective terms; review those before any commercial use.
