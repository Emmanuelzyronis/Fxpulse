"use client";

import { useMemo } from "react";

import { useAlertsStore } from "@/stores/alertsStore";
import { useHasHydrated } from "@/hooks/useHasHydrated";
import { useAssets } from "@/hooks/useAssets";
import { useRates } from "@/hooks/useRates";
import { canConvert, rateOf } from "@/lib/rates/convert";
import { formatAmount } from "@/lib/format/number";
import { relativeTime, formatDateTime } from "@/lib/format/date";
import { parseId, isAssetId } from "@/lib/assets/ids";
import type { RateAlert } from "@/types/alerts";
import { AssetGlyph } from "@/components/converter/AssetSelect";
import { Skeleton } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { BellIcon, TrashIcon } from "@/components/layout/icons";
import { toast } from "sonner";

export function AlertList() {
  const hydrated = useHasHydrated();
  const alerts = useAlertsStore((s) => s.alerts);
  const remove = useAlertsStore((s) => s.remove);
  const reArm = useAlertsStore((s) => s.reArm);
  const clearTriggered = useAlertsStore((s) => s.clearTriggered);

  const { data: catalog } = useAssets();
  const assets = useMemo(() => catalog?.assets ?? [], [catalog]);
  const assetById = useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets],
  );
  const symOf = (id: string) =>
    assetById.get(id)?.symbol ?? (isAssetId(id) ? parseId(id).upstreamId : id);

  // One batched rates request covering every leg on the page, reused from the
  // engine's cache entry — so the list shows the same "now" the engine checks.
  const legs = useMemo(() => {
    const set = new Set<string>();
    for (const a of alerts) {
      set.add(a.from);
      set.add(a.to);
    }
    return [...set];
  }, [alerts]);
  const { data: rates } = useRates(legs);

  const triggeredCount = alerts.filter((a) => a.status === "triggered").length;

  function handleRemove(alert: RateAlert) {
    const snapshot = alerts;
    remove(alert.id);
    toast("Alert removed", {
      description: `${symOf(alert.from)}/${symOf(alert.to)} ${alert.direction} ${formatAmount(alert.target)} ${symOf(alert.to)}`,
      action: {
        label: "Undo",
        onClick: () => useAlertsStore.setState({ alerts: snapshot }),
      },
    });
  }

  function handleClearTriggered() {
    const snapshot = alerts;
    clearTriggered();
    toast("Cleared triggered alerts", {
      description: `${triggeredCount} ${triggeredCount === 1 ? "alert" : "alerts"} removed`,
      action: {
        label: "Undo",
        onClick: () => useAlertsStore.setState({ alerts: snapshot }),
      },
    });
  }

  // Skeleton until the store rehydrates, so the list doesn't flash empty.
  if (!hydrated) {
    return (
      <ul
        className="divide-y divide-border rounded-2xl border border-border bg-surface"
        aria-hidden="true"
      >
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3.5">
            <Skeleton className="h-5 w-10 rounded-md" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </li>
        ))}
      </ul>
    );
  }

  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={<BellIcon className="h-6 w-6 text-muted" />}
        title="No alerts yet"
        description="Set a target above and FXPulse watches the rate for you — you’ll get a toast (and a browser notification, if you allow it) the moment it’s hit."
      />
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-surface shadow-panel">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <span className="text-xs font-medium text-muted">
          {alerts.length} {alerts.length === 1 ? "alert" : "alerts"}
          {triggeredCount > 0 && (
            <span className="text-brand"> · {triggeredCount} triggered</span>
          )}
        </span>
        {triggeredCount > 0 && (
          <button
            type="button"
            onClick={handleClearTriggered}
            className="text-xs font-medium text-muted transition-colors hover:text-fg"
          >
            Clear triggered
          </button>
        )}
      </header>

      <ul className="divide-y divide-border">
        {alerts.map((alert) => {
          const fromSym = symOf(alert.from);
          const toSym = symOf(alert.to);
          const now =
            rates && canConvert(alert.from, alert.to, rates)
              ? rateOf(alert.from, alert.to, rates)
              : null;
          const cmp = alert.direction === "above" ? "≥" : "≤";
          const triggered = alert.status === "triggered";

          return (
            <li key={alert.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className="flex flex-none items-center gap-1">
                <AssetGlyph asset={assetById.get(alert.from)} symbol={fromSym} />
                <AssetGlyph asset={assetById.get(alert.to)} symbol={toSym} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 font-mono text-sm tabular">
                  <span className="font-semibold text-fg">
                    {fromSym}/{toSym}
                  </span>
                  <span className="text-muted">
                    {cmp} {formatAmount(alert.target)} {toSym}
                  </span>
                  {alert.repeat && (
                    <span className="rounded border border-border px-1.5 py-px font-sans text-[10px] font-medium uppercase tracking-wide text-muted">
                      Repeats
                    </span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-xs text-muted">
                  {now != null
                    ? `Now ${formatAmount(now)} ${toSym}`
                    : "Live rate unavailable"}
                  {alert.note && (
                    <span className="text-muted"> · {alert.note}</span>
                  )}
                </div>
              </div>

              {/* Status */}
              {triggered ? (
                <time
                  dateTime={
                    alert.triggeredAt
                      ? new Date(alert.triggeredAt).toISOString()
                      : undefined
                  }
                  title={
                    alert.triggeredAt ? formatDateTime(alert.triggeredAt) : undefined
                  }
                  className="inline-flex flex-none items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand"
                >
                  Triggered
                  {alert.triggeredAt && (
                    <span className="tabular text-brand/70">
                      {relativeTime(alert.triggeredAt)}
                    </span>
                  )}
                </time>
              ) : (
                <span className="inline-flex flex-none items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-up" aria-hidden="true" />
                  Watching
                </span>
              )}

              {/* Actions */}
              <div className="flex flex-none items-center gap-1">
                {triggered && (
                  <button
                    type="button"
                    onClick={() => reArm(alert.id)}
                    className="rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(alert)}
                  aria-label={`Remove alert ${fromSym}/${toSym}`}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-down"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-border px-4 py-3 text-xs text-muted">
        Checks run while a FXPulse tab is open · slower in the background · newest first
      </div>
    </section>
  );
}
