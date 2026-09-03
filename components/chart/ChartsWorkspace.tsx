"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAssets } from "@/hooks/useAssets";
import { useHistories, type HistoryPairInput } from "@/hooks/useHistories";
import {
  seriesChangePct,
  type NamedSeries,
  type NormalizeMode,
} from "@/lib/history/normalizeSeries";
import type { HistoryRange } from "@/types/history";
import { pairId, parseId, isAssetId } from "@/lib/assets/ids";
import { AssetSelect } from "@/components/converter/AssetSelect";
import { DeltaChip } from "@/components/common/DeltaChip";
import { Skeleton } from "@/components/common/Skeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { SwapIcon, CloseIcon } from "@/components/layout/icons";
import { RateChart, seriesColor } from "./RateChart";
import { TimeframePicker } from "./TimeframePicker";
import { NormalizeToggle } from "./NormalizeToggle";

const MAX_SERIES = 4;

interface ComparePair {
  key: string;
  from: string;
  to: string;
}

function fmtClose(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function ChartsWorkspace() {
  const { data: catalog, isLoading: assetsLoading } = useAssets();
  const assets = useMemo(() => catalog?.assets ?? [], [catalog]);
  const assetById = useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets],
  );

  const [primaryFrom, setPrimaryFrom] = useState("fiat:EUR");
  const [primaryTo, setPrimaryTo] = useState("fiat:USD");
  const [compares, setCompares] = useState<ComparePair[]>([]);
  const [range, setRange] = useState<HistoryRange>("30d");
  const [mode, setMode] = useState<NormalizeMode>("absolute");
  const cmpCounter = useRef(0);

  // Recharts' ResponsiveContainer needs a real DOM box; render it only after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const symOf = (id: string) =>
    assetById.get(id)?.symbol ?? (isAssetId(id) ? parseId(id).upstreamId : id);
  const labelOf = (from: string, to: string) => `${symOf(from)}/${symOf(to)}`;

  const pairs: HistoryPairInput[] = useMemo(
    () => [
      {
        id: "primary",
        from: primaryFrom,
        to: primaryTo,
        label: labelOf(primaryFrom, primaryTo),
      },
      ...compares.map((c) => ({
        id: c.key,
        from: c.from,
        to: c.to,
        label: labelOf(c.from, c.to),
      })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [primaryFrom, primaryTo, compares, assetById],
  );

  const results = useHistories(pairs, range);
  const resultById = useMemo(
    () => new Map(results.map((r) => [r.input.id, r])),
    [results],
  );

  // One entry per pair (in order) so colors stay aligned to the legend even
  // while some pairs are still loading.
  const series: NamedSeries[] = pairs.map((p) => ({
    id: p.id,
    label: p.label,
    points: resultById.get(p.id)?.data?.points ?? [],
  }));

  const seriesCount = pairs.length;
  const showLegend = seriesCount > 1;
  // A single pair always shows its real rate; overlays honor the chosen scale
  // (absolute is still valid for same-magnitude pairs like EUR/USD vs GBP/USD).
  const effectiveMode: NormalizeMode = seriesCount <= 1 ? "absolute" : mode;

  const anyData = series.some((s) => s.points.length > 0);
  const allLoading = results.length > 0 && results.every((r) => r.isLoading && !r.data);
  const allError = results.length > 0 && results.every((r) => r.isError);
  const hasGaps = results.some((r) => r.data?.meta.hasGaps);
  const primary = resultById.get("primary");
  const primaryPct = primary?.data ? seriesChangePct(primary.data.points) : null;
  const asOf = primary?.data?.meta.asOf;
  const samePair = primaryFrom === primaryTo;

  const retryAll = () => results.forEach((r) => r.refetch());

  function usedKeys(): Set<string> {
    const s = new Set<string>();
    s.add(pairId(primaryFrom, primaryTo));
    for (const c of compares) s.add(pairId(c.from, c.to));
    return s;
  }

  function addCompare() {
    if (seriesCount >= MAX_SERIES) return;
    const used = usedKeys();
    const from = primaryFrom;
    let to = primaryTo;
    for (const a of assets) {
      if (a.id !== from && !used.has(pairId(from, a.id))) {
        to = a.id;
        break;
      }
    }
    cmpCounter.current += 1;
    setCompares((prev) => [...prev, { key: `cmp-${cmpCounter.current}`, from, to }]);
    if (mode === "absolute") setMode("index100");
  }

  function updateCompare(key: string, patch: Partial<ComparePair>) {
    setCompares((prev) =>
      prev.map((c) => (c.key === key ? { ...c, ...patch } : c)),
    );
  }

  function removeCompare(key: string) {
    setCompares((prev) => prev.filter((c) => c.key !== key));
  }

  function swapPrimary() {
    setPrimaryFrom(primaryTo);
    setPrimaryTo(primaryFrom);
  }

  return (
    <div className="space-y-4">
      {/* Controls: primary pair + timeframe */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-end gap-2">
          <div className="min-w-0">
            <span className="mb-1 block text-xs font-medium text-muted">Base</span>
            <AssetSelect
              assets={assets}
              value={primaryFrom}
              onChange={setPrimaryFrom}
              loading={assetsLoading}
              label="Base asset"
            />
          </div>
          <button
            type="button"
            onClick={swapPrimary}
            aria-label="Swap base and quote"
            className="mb-0.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-border bg-surface text-muted transition-colors hover:border-brand/40 hover:text-brand"
          >
            <SwapIcon className="h-4 w-4 rotate-90" />
          </button>
          <div className="min-w-0">
            <span className="mb-1 block text-xs font-medium text-muted">Quote</span>
            <AssetSelect
              assets={assets}
              value={primaryTo}
              onChange={setPrimaryTo}
              loading={assetsLoading}
              label="Quote asset"
            />
          </div>
        </div>
        <TimeframePicker value={range} onChange={setRange} />
      </div>

      {/* Chart panel */}
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-panel sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h2 className="font-mono text-lg font-semibold tabular text-fg">
              {labelOf(primaryFrom, primaryTo)}
            </h2>
            <DeltaChip change={primaryPct} windowLabel={range} />
          </div>
          <div className="flex items-center gap-3">
            {asOf ? (
              <span className="hidden text-xs text-muted sm:inline">
                Last close {fmtClose(asOf)}
              </span>
            ) : null}
            {showLegend ? (
              <NormalizeToggle value={effectiveMode} onChange={setMode} />
            ) : null}
          </div>
        </div>

        {samePair ? (
          <div className="flex h-[300px] items-center justify-center text-center text-sm text-muted">
            Pick two different assets to chart a rate.
          </div>
        ) : allError ? (
          <div className="py-8">
            <ErrorState
              title="Couldn't load history"
              message="The rate history service didn't respond. Try again in a moment."
              onRetry={retryAll}
            />
          </div>
        ) : allLoading || !mounted ? (
          <Skeleton className="h-[300px] w-full" />
        ) : !anyData ? (
          <div className="flex h-[300px] items-center justify-center text-center text-sm text-muted">
            No history available for this pair yet.
          </div>
        ) : (
          <RateChart series={series} mode={effectiveMode} height={300} />
        )}

        {hasGaps ? (
          <p className="mt-3 text-xs text-muted">
            Gaps on weekends and holidays are forward-filled from the last close.
          </p>
        ) : null}
      </section>

      {/* Compare pairs */}
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-panel">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fg">Compare pairs</h3>
          <button
            type="button"
            onClick={addCompare}
            disabled={seriesCount >= MAX_SERIES}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Add comparison
          </button>
        </div>

        {compares.length === 0 ? (
          <p className="text-sm text-muted">
            Add up to {MAX_SERIES - 1} more pairs to overlay their trends. Different
            magnitudes are normalized so moves line up.
          </p>
        ) : (
          <ul className="space-y-2">
            {compares.map((c) => {
              const res = resultById.get(c.key);
              const pct = res?.data ? seriesChangePct(res.data.points) : null;
              const idx = pairs.findIndex((p) => p.id === c.key);
              return (
                <li key={c.key} className="flex flex-wrap items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 flex-none rounded-full"
                    style={{ background: seriesColor(idx) }}
                    aria-hidden
                  />
                  <AssetSelect
                    assets={assets}
                    value={c.from}
                    onChange={(id) => updateCompare(c.key, { from: id })}
                    loading={assetsLoading}
                    label="Compare base asset"
                  />
                  <span className="text-muted">/</span>
                  <AssetSelect
                    assets={assets}
                    value={c.to}
                    onChange={(id) => updateCompare(c.key, { to: id })}
                    loading={assetsLoading}
                    label="Compare quote asset"
                  />
                  <DeltaChip change={pct} windowLabel={range} size="sm" />
                  <button
                    type="button"
                    onClick={() => removeCompare(c.key)}
                    aria-label={`Remove ${labelOf(c.from, c.to)}`}
                    className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
