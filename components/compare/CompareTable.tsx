"use client";

import { useMemo, useRef, useState } from "react";
import { useAssets } from "@/hooks/useAssets";
import { useRates } from "@/hooks/useRates";
import { useHistories, type HistoryPairInput } from "@/hooks/useHistories";
import { seriesChangePct } from "@/lib/history/normalizeSeries";
import type { HistoryRange } from "@/types/history";
import { canConvert, convert, rateOf } from "@/lib/rates/convert";
import { formatAmount, parseAmount } from "@/lib/format/number";
import { parseId, isAssetId } from "@/lib/assets/ids";
import { AUTO_PRECISION } from "@/types/settings";
import { useSettingsStore } from "@/stores/settingsStore";
import { useHasHydrated } from "@/hooks/useHasHydrated";
import { AssetSelect, AssetGlyph } from "@/components/converter/AssetSelect";
import { MoneyField } from "@/components/converter/MoneyField";
import { DeltaChip } from "@/components/common/DeltaChip";
import { Skeleton } from "@/components/common/Skeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { TimeframePicker } from "@/components/chart/TimeframePicker";
import { CompareIcon, CloseIcon } from "@/components/layout/icons";
import { Sparkline } from "./Sparkline";

const MAX_TARGETS = 12;
const DEFAULT_TARGET_IDS = [
  "fiat:EUR",
  "fiat:GBP",
  "fiat:JPY",
  "fiat:CHF",
  "crypto:bitcoin",
];
const BASE_ID = "fiat:USD";

interface Target {
  key: string;
  id: string;
}

function initialTargets(base: string): Target[] {
  return DEFAULT_TARGET_IDS.filter((id) => id !== base).map((id, i) => ({
    key: `t${i}`,
    id,
  }));
}

export function CompareTable() {
  const { data: catalog, isLoading: assetsLoading } = useAssets();
  const assets = useMemo(() => catalog?.assets ?? [], [catalog]);
  const assetById = useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets],
  );

  const hydrated = useHasHydrated();
  const precisionPref = useSettingsStore((s) => s.precision);
  const precision = hydrated ? precisionPref : AUTO_PRECISION;

  const [base, setBase] = useState(BASE_ID);
  const [amountInput, setAmountInput] = useState("100");
  const [targets, setTargets] = useState<Target[]>(() => initialTargets(BASE_ID));
  const [range, setRange] = useState<HistoryRange>("30d");
  const counter = useRef(DEFAULT_TARGET_IDS.length);

  const amountNum = parseAmount(amountInput);
  const hasAmount = Number.isFinite(amountNum);

  const symOf = (id: string) =>
    assetById.get(id)?.symbol ?? (isAssetId(id) ? parseId(id).upstreamId : id);
  const nameOf = (id: string) => assetById.get(id)?.name ?? "";
  const baseSym = symOf(base);

  // One batched rate request covers the base + every target.
  const rateIds = useMemo(
    () => [base, ...targets.map((t) => t.id)],
    [base, targets],
  );
  const {
    data: rates,
    isLoading: ratesLoading,
    isError: ratesError,
    refetch: refetchRates,
  } = useRates(rateIds);

  // One history series per target, keyed by the row so sparklines stay aligned.
  const pairs: HistoryPairInput[] = useMemo(
    () =>
      targets.map((t) => ({
        id: t.key,
        from: base,
        to: t.id,
        label: `${symOf(base)}/${symOf(t.id)}`,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base, targets, assetById],
  );
  const histories = useHistories(pairs, range);
  const historyByKey = useMemo(
    () => new Map(histories.map((h) => [h.input.id, h])),
    [histories],
  );

  function usedIds(): Set<string> {
    return new Set([base, ...targets.map((t) => t.id)]);
  }

  function addTarget() {
    if (targets.length >= MAX_TARGETS) return;
    const used = usedIds();
    const next = assets.find((a) => !used.has(a.id));
    if (!next) return;
    counter.current += 1;
    setTargets((prev) => [...prev, { key: `t${counter.current}`, id: next.id }]);
  }

  function updateTarget(key: string, id: string) {
    setTargets((prev) => prev.map((t) => (t.key === key ? { ...t, id } : t)));
  }

  function removeTarget(key: string) {
    setTargets((prev) => prev.filter((t) => t.key !== key));
  }

  const ratesReady = Boolean(rates);
  const showRatesError = ratesError && !rates;
  const partialCount = rates?.partial?.length ?? 0;

  return (
    <div className="space-y-4">
      {/* Base amount — the number that fans out across every currency below. */}
      <MoneyField
        label="Amount"
        assets={assets}
        assetId={base}
        onAssetChange={setBase}
        loadingAssets={assetsLoading}
        value={amountInput}
        onValueChange={setAmountInput}
        autoFocus
      />

      <section className="rounded-2xl border border-border bg-surface shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-fg">In every currency</h2>
            <p className="truncate text-xs text-muted">
              {hasAmount
                ? `${formatAmount(amountNum, { precision })} ${baseSym} converted live`
                : "Enter an amount to compare"}
            </p>
          </div>
          <TimeframePicker value={range} onChange={setRange} />
        </div>

        {showRatesError ? (
          <div className="p-4">
            <ErrorState
              title="Couldn't load rates"
              message="The rate service didn't respond. Try again in a moment."
              onRetry={refetchRates}
            />
          </div>
        ) : targets.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<CompareIcon className="h-6 w-6 text-muted" />}
              title="No currencies to compare"
              description="Add a few currencies to see your amount converted across all of them at once."
              action={
                <button
                  type="button"
                  onClick={addTarget}
                  className="rounded-lg bg-fg px-3 py-1.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
                >
                  Add currency
                </button>
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {targets.map((t) => {
              const res = historyByKey.get(t.key);
              const points = res?.data?.points ?? [];
              const values = points.map((p) => p.value);
              const pct = res?.data ? seriesChangePct(points) : null;

              const convertible = ratesReady && rates ? canConvert(base, t.id, rates) : false;
              const rate = convertible && rates ? rateOf(base, t.id, rates) : null;
              const converted =
                convertible && rates && hasAmount
                  ? convert(amountNum, base, t.id, rates)
                  : null;

              const dirColor =
                pct == null
                  ? "rgb(var(--muted))"
                  : pct >= 0
                    ? "rgb(var(--up))"
                    : "rgb(var(--down))";
              const tgtSym = symOf(t.id);

              return (
                <li
                  key={t.key}
                  className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3"
                >
                  {/* Identity */}
                  <div className="flex min-w-[7.5rem] items-center gap-2">
                    <AssetGlyph asset={assetById.get(t.id)} symbol={tgtSym} />
                    <AssetSelect
                      assets={assets}
                      value={t.id}
                      onChange={(id) => updateTarget(t.key, id)}
                      loading={assetsLoading}
                      label="Comparison currency"
                    />
                    <span className="hidden truncate text-sm text-muted sm:inline">
                      {nameOf(t.id)}
                    </span>
                  </div>

                  {/* Numbers */}
                  <div className="ml-auto flex items-center gap-4">
                    <div className="min-w-[6.5rem] text-right">
                      {converted != null ? (
                        <div className="font-mono text-lg font-medium tabular text-fg">
                          {formatAmount(converted, { precision })}
                          <span className="ml-1 text-sm font-normal text-muted">
                            {tgtSym}
                          </span>
                        </div>
                      ) : !ratesReady && ratesLoading ? (
                        <Skeleton className="ml-auto h-6 w-24" />
                      ) : (
                        <div className="font-mono text-lg text-muted">—</div>
                      )}
                      <div className="font-mono text-xs tabular text-muted">
                        {rate != null
                          ? `1 ${baseSym} = ${formatAmount(rate)} ${tgtSym}`
                          : " "}
                      </div>
                    </div>

                    <Sparkline
                      values={values}
                      stroke={dirColor}
                      fill={dirColor}
                      className="h-8 w-20 flex-none sm:w-28"
                      ariaLabel={
                        pct != null
                          ? `${baseSym} to ${tgtSym} trend over ${range}`
                          : undefined
                      }
                    />

                    <div className="w-20 text-right">
                      <DeltaChip change={pct} windowLabel={range} size="sm" />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeTarget(t.key)}
                      aria-label={`Remove ${tgtSym}`}
                      className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                    >
                      <CloseIcon className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {targets.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
            <button
              type="button"
              onClick={addTarget}
              disabled={targets.length >= MAX_TARGETS}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Add currency
            </button>
            {partialCount > 0 ? (
              <span className="text-xs text-muted">
                Some rates are delayed and served from the last good value.
              </span>
            ) : (
              <span className="text-xs text-muted">
                {targets.length} of {MAX_TARGETS} currencies
              </span>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
