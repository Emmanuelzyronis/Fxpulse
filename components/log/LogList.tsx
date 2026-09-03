"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { useLogStore } from "@/stores/logStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useHasHydrated } from "@/hooks/useHasHydrated";
import { useAssets } from "@/hooks/useAssets";
import { formatAmount, formatRateLine } from "@/lib/format/number";
import { formatDateTime, relativeTime, toUtcDay } from "@/lib/format/date";
import { toCsv, downloadCsv } from "@/lib/csv";
import { parseId, isAssetId } from "@/lib/assets/ids";
import { AUTO_PRECISION } from "@/types/settings";
import type { AssetKind } from "@/types/asset";
import type { LogEntry } from "@/types/log";
import { cn } from "@/lib/cn";
import { AssetGlyph } from "@/components/converter/AssetSelect";
import { Skeleton } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import {
  LogIcon,
  SearchIcon,
  TrashIcon,
  CloseIcon,
  DownloadIcon,
} from "@/components/layout/icons";

type KindFilter = "all" | AssetKind;

const KIND_FILTERS: { value: KindFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "fiat", label: "Fiat" },
  { value: "crypto", label: "Crypto" },
  { value: "metal", label: "Metals" },
];

export function LogList() {
  const hydrated = useHasHydrated();
  const entries = useLogStore((s) => s.entries);
  const remove = useLogStore((s) => s.remove);
  const clear = useLogStore((s) => s.clear);

  const precisionPref = useSettingsStore((s) => s.precision);
  const precision = hydrated ? precisionPref : AUTO_PRECISION;

  const { data: catalog } = useAssets();
  const assets = useMemo(() => catalog?.assets ?? [], [catalog]);
  const assetById = useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets],
  );

  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");

  const symOf = (id: string) =>
    assetById.get(id)?.symbol ?? (isAssetId(id) ? parseId(id).upstreamId : id);
  const nameOf = (id: string) => assetById.get(id)?.name ?? "";
  const kindOf = (id: string): AssetKind | null =>
    isAssetId(id) ? parseId(id).kind : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (kind !== "all" && kindOf(e.from) !== kind && kindOf(e.to) !== kind) {
        return false;
      }
      if (q) {
        const hay =
          `${symOf(e.from)} ${nameOf(e.from)} ${symOf(e.to)} ${nameOf(e.to)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    // symOf/nameOf/kindOf are derived from assetById.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, query, kind, assetById]);

  function handleRemove(entry: LogEntry) {
    // Snapshot the whole list so Undo restores the entry in its original spot
    // (re-logging would prepend it and mint a new id).
    const snapshot = entries;
    remove(entry.id);
    toast("Entry removed", {
      description: `${symOf(entry.from)} → ${symOf(entry.to)}`,
      action: {
        label: "Undo",
        onClick: () => useLogStore.setState({ entries: snapshot }),
      },
    });
  }

  function handleClear() {
    const snapshot = entries;
    clear();
    toast("Log cleared", {
      description: `${snapshot.length} ${snapshot.length === 1 ? "entry" : "entries"} removed`,
      action: {
        label: "Undo",
        onClick: () => useLogStore.setState({ entries: snapshot }),
      },
    });
  }

  function handleExport() {
    const headers = ["Timestamp (UTC)", "From", "To", "Amount", "Result", "Rate"];
    const rows = filtered.map((e) => [
      new Date(e.at).toISOString(),
      symOf(e.from),
      symOf(e.to),
      e.amount,
      e.result,
      e.rate,
    ]);
    downloadCsv(`fxpulse-log-${toUtcDay(Date.now())}.csv`, toCsv(headers, rows));
    toast.success(`Exported ${rows.length} ${rows.length === 1 ? "row" : "rows"}`);
  }

  // Hold a skeleton until the store rehydrates so the list doesn't flash
  // empty and then fill.
  if (!hydrated) {
    return (
      <ul className="divide-y divide-border rounded-2xl border border-border bg-surface" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-5 w-10 rounded-md" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-4 w-14" />
          </li>
        ))}
      </ul>
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<LogIcon className="h-6 w-6 text-muted" />}
        title="No conversions yet"
        description="Convert an amount and press Enter — every conversion you save lands here, searchable and exportable."
        action={
          <Link
            href="/"
            className="rounded-lg bg-fg px-3 py-1.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
          >
            Open converter
          </Link>
        }
      />
    );
  }

  const noMatches = filtered.length === 0;
  const nearCap = entries.length >= 950;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 sm:w-72">
          <SearchIcon className="h-4 w-4 shrink-0 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by currency…"
            aria-label="Search conversions"
            className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-muted"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="flex-none text-muted transition-colors hover:text-fg"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="radiogroup"
            aria-label="Filter by asset type"
            className="inline-flex rounded-lg border border-border bg-surface p-0.5"
          >
            {KIND_FILTERS.map((k) => {
              const active = k.value === kind;
              return (
                <button
                  key={k.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setKind(k.value)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    active ? "bg-fg text-bg" : "text-muted hover:text-fg",
                  )}
                >
                  {k.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={noMatches}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
          >
            <DownloadIcon className="h-4 w-4" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-down/40 hover:text-down"
          >
            <TrashIcon className="h-4 w-4" />
            Clear
          </button>
        </div>
      </div>

      {/* List */}
      <section className="rounded-2xl border border-border bg-surface shadow-panel">
        {noMatches ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-muted">No conversions match your filters.</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setKind("all");
              }}
              className="mt-2 text-sm font-medium text-fg transition-colors hover:text-brand"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((e) => {
              const fromSym = symOf(e.from);
              const toSym = symOf(e.to);
              return (
                <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <div className="flex flex-none items-center gap-1">
                      <AssetGlyph asset={assetById.get(e.from)} symbol={fromSym} />
                      <AssetGlyph asset={assetById.get(e.to)} symbol={toSym} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-sm tabular">
                        <span className="text-fg">
                          {formatAmount(e.amount, { precision })} {fromSym}
                        </span>
                        <span className="px-1 text-muted">→</span>
                        <span className="font-semibold text-fg">
                          {formatAmount(e.result, { precision })} {toSym}
                        </span>
                      </div>
                      <div className="truncate text-xs text-muted">
                        {formatRateLine(e.rate, fromSym, toSym)}
                      </div>
                    </div>
                  </div>

                  <time
                    dateTime={new Date(e.at).toISOString()}
                    title={formatDateTime(e.at)}
                    className="hidden flex-none text-xs tabular text-muted sm:block"
                  >
                    {relativeTime(e.at)}
                  </time>

                  <button
                    type="button"
                    onClick={() => handleRemove(e)}
                    aria-label={`Remove conversion ${fromSym} to ${toSym}`}
                    className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-down"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted">
          <span>
            {filtered.length === entries.length
              ? `${entries.length} ${entries.length === 1 ? "conversion" : "conversions"}`
              : `${filtered.length} of ${entries.length} shown`}
          </span>
          <span>
            {nearCap
              ? "Keeping the most recent 1,000 — older entries are trimmed."
              : "Saved on this device · newest first"}
          </span>
        </div>
      </section>
    </div>
  );
}
