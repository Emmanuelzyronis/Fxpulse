"use client";

import { useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAlertsStore } from "@/stores/alertsStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useHasHydrated } from "@/hooks/useHasHydrated";
import { fetchRates, ratesQueryKey } from "@/lib/rates/ratesQuery";
import { rateOf, canConvert } from "@/lib/rates/convert";
import { evaluateAlert } from "@/lib/alerts/evaluate";
import { formatAmount } from "@/lib/format/number";
import { parseId, isAssetId } from "@/lib/assets/ids";
import type { Catalog } from "@/lib/assets/catalog";
import type { RateAlert } from "@/types/alerts";
import type { UnifiedRates } from "@/types/rates";

/** How long a cached rate stays fresh enough for an alert check. */
const RATE_STALE_MS = 30_000;

/** Symbol for an id, from the catalog if we have it, else the raw upstream id. */
function symbolFor(id: string, catalog?: Catalog): string {
  const asset = catalog?.assets.find((a) => a.id === id);
  return asset?.symbol ?? (isAssetId(id) ? parseId(id).upstreamId : id);
}

function notify(alert: RateAlert, rate: number, catalog?: Catalog) {
  const fromSym = symbolFor(alert.from, catalog);
  const toSym = symbolFor(alert.to, catalog);
  const verb = alert.direction === "above" ? "rose to" : "fell to";
  const headline = `${fromSym}/${toSym} ${verb} ${formatAmount(rate)} ${toSym}`;
  const detail = `Your ${alert.direction} ${formatAmount(alert.target)} ${toSym} target was reached.`;

  // In-app toast always fires.
  toast.success(headline, { description: detail, duration: 12_000 });

  // Browser notification only when the user asked for it and the OS allows it.
  const { notifyEnabled } = useSettingsStore.getState();
  if (
    notifyEnabled &&
    typeof Notification !== "undefined" &&
    Notification.permission === "granted"
  ) {
    try {
      new Notification("FXPulse rate alert", {
        body: `${headline}. ${detail}`,
        tag: alert.id, // collapse repeats of the same alert
      });
    } catch {
      // Some platforms throw when constructing Notification directly; the toast
      // already delivered the alert, so this is non-fatal.
    }
  }
}

/**
 * Client-only rate-alert engine. Mounted once via <AlertEngine/> in Providers,
 * so it runs on every route while a tab is open.
 *
 *  - Watches `active` alerts (and repeating `triggered` ones, which can re-arm).
 *  - Batches ONE /api/rates request covering every leg, reusing the shared
 *    TanStack Query cache so it piggybacks on data other views already loaded.
 *  - Fires once per crossing (`markTriggered`), re-toasting is prevented across
 *    reloads because the triggered status is persisted.
 *  - `repeat` alerts re-arm only after the rate crosses back past the target
 *    (hysteresis), so they don't flap.
 *
 * There's no service worker: checks run only while a FXPulse tab is open, and
 * the browser slows the interval while the tab is backgrounded. The UI says so.
 */
export function useAlertEngine() {
  const hydrated = useHasHydrated();
  const queryClient = useQueryClient();
  const intervalSec = useSettingsStore((s) => s.alertIntervalSec);

  // Re-sync the poller whenever the *watchable* set meaningfully changes (a new
  // alert, an edited threshold, a status flip) — but not on unrelated renders.
  const watchSignature = useAlertsStore((s) =>
    s.alerts
      .filter((a) => a.status === "active" || (a.repeat && a.status === "triggered"))
      .map((a) => `${a.id}:${a.from}:${a.to}:${a.direction}:${a.target}:${a.status}`)
      .join("|"),
  );

  const check = useCallback(async () => {
    const { alerts, markTriggered, reArm } = useAlertsStore.getState();
    const watch = alerts.filter(
      (a) => a.status === "active" || (a.repeat && a.status === "triggered"),
    );
    if (watch.length === 0) return;

    const legs = new Set<string>();
    for (const a of watch) {
      legs.add(a.from);
      legs.add(a.to);
    }
    const ids = [...legs];

    let rates: UnifiedRates;
    try {
      rates = await queryClient.fetchQuery({
        queryKey: ratesQueryKey(ids),
        queryFn: () => fetchRates(ids),
        staleTime: RATE_STALE_MS,
      });
    } catch {
      // Transient upstream failure — leave alerts as-is and try next tick.
      return;
    }

    const catalog = queryClient.getQueryData<Catalog>(["assets"]);

    for (const alert of watch) {
      if (!canConvert(alert.from, alert.to, rates)) continue;
      const rate = rateOf(alert.from, alert.to, rates);
      const action = evaluateAlert(alert, rate);
      if (action === "fire") {
        markTriggered(alert.id, rate);
        notify(alert, rate, catalog);
      } else if (action === "rearm") {
        reArm(alert.id);
      }
    }
  }, [queryClient]);

  useEffect(() => {
    if (!hydrated) return;

    // One check now (a freshly created alert near its target fires promptly),
    // then on an interval. The browser throttles the interval in the background;
    // we add immediate catch-up checks when the tab regains focus or the network
    // comes back, so nothing is missed on return.
    void check();

    const ms = Math.max(30, intervalSec) * 1000;
    const timer = setInterval(() => void check(), ms);

    const onVisible = () => {
      if (!document.hidden) void check();
    };
    const onOnline = () => void check();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [hydrated, intervalSec, watchSignature, check]);
}
