"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useAlertsStore } from "@/stores/alertsStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useHasHydrated } from "@/hooks/useHasHydrated";
import { useAssets } from "@/hooks/useAssets";
import { useRates } from "@/hooks/useRates";
import { canConvert, rateOf } from "@/lib/rates/convert";
import { formatAmount, formatRateLine, parseAmount } from "@/lib/format/number";
import { parseId, isAssetId } from "@/lib/assets/ids";
import { cn } from "@/lib/cn";
import type { AlertDirection } from "@/types/alerts";
import { AssetSelect } from "@/components/converter/AssetSelect";
import { SwapIcon, BellIcon, CheckIcon } from "@/components/layout/icons";
import { toast } from "sonner";

const DIRECTIONS: { value: AlertDirection; label: string; hint: string }[] = [
  { value: "above", label: "Rises to", hint: "at or above" },
  { value: "below", label: "Falls to", hint: "at or below" },
];

export function AlertForm() {
  const hydrated = useHasHydrated();
  const create = useAlertsStore((s) => s.create);

  const { data: catalog } = useAssets();
  const assets = useMemo(() => catalog?.assets ?? [], [catalog]);
  const assetById = useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets],
  );
  const symOf = (id: string) =>
    assetById.get(id)?.symbol ?? (isAssetId(id) ? parseId(id).upstreamId : id);

  const [from, setFrom] = useState("fiat:USD");
  const [to, setTo] = useState("fiat:EUR");
  const [direction, setDirection] = useState<AlertDirection>("above");
  const [targetStr, setTargetStr] = useState("");
  const [repeat, setRepeat] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Seed the pair from the converter's current selection, once, after hydration
  // — so opening Alerts continues whatever the user was just looking at.
  const seeded = useRef(false);
  useEffect(() => {
    if (hydrated && !seeded.current) {
      const s = useSettingsStore.getState();
      setFrom(s.baseId);
      setTo(s.quoteId);
      seeded.current = true;
    }
  }, [hydrated]);

  const { data: rates } = useRates([from, to]);
  const currentRate =
    rates && canConvert(from, to, rates) ? rateOf(from, to, rates) : null;

  const fromSym = symOf(from);
  const toSym = symOf(to);

  const parsedTarget = parseAmount(targetStr);
  const targetValid = Number.isFinite(parsedTarget) && parsedTarget > 0;
  const willTriggerNow =
    targetValid && currentRate != null
      ? direction === "above"
        ? currentRate >= parsedTarget
        : currentRate <= parsedTarget
      : false;

  function swap() {
    setFrom(to);
    setTo(from);
  }

  function useCurrent() {
    if (currentRate == null) return;
    setTargetStr(formatAmount(currentRate, { grouping: false }));
    setError(null);
  }

  // Tie the browser-permission request to this click (a real user gesture).
  function requestNotifyOnGesture() {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      useSettingsStore.getState().setNotifyEnabled(true);
    } else if (Notification.permission === "default") {
      void Notification.requestPermission().then((perm) => {
        useSettingsStore.getState().setNotifyEnabled(perm === "granted");
      });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (from === to) {
      setError("Pick two different assets to watch a rate between them.");
      return;
    }
    if (!targetValid) {
      setError("Enter a target rate greater than zero.");
      return;
    }

    requestNotifyOnGesture();
    create({
      from,
      to,
      direction,
      target: parsedTarget,
      repeat,
      note: note.trim() || undefined,
    });

    toast.success("Alert set", {
      description: `${fromSym}/${toSym} ${direction} ${formatAmount(parsedTarget)} ${toSym}`,
    });

    // Keep the pair and direction (people often set several around one pair);
    // clear the per-alert fields.
    setTargetStr("");
    setNote("");
    setError(null);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-panel sm:p-5"
    >
      {/* Pair */}
      <div>
        <span className="mb-1.5 block text-xs font-medium text-muted">
          Watch the rate of
        </span>
        <div className="flex items-center gap-2">
          <AssetSelect
            assets={assets}
            value={from}
            onChange={setFrom}
            loading={!catalog}
            label="Alert base"
          />
          <button
            type="button"
            onClick={swap}
            aria-label="Swap assets"
            className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-border text-muted transition-colors hover:text-fg"
          >
            <SwapIcon className="h-4 w-4" />
          </button>
          <AssetSelect
            assets={assets}
            value={to}
            onChange={setTo}
            loading={!catalog}
            align="right"
            label="Alert quote"
          />
          <span className="ml-1 truncate text-sm text-muted">
            {fromSym} → {toSym}
          </span>
        </div>
      </div>

      {/* Condition */}
      <div className="space-y-2">
        <span className="block text-xs font-medium text-muted">
          Notify me when it
        </span>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <div
            role="radiogroup"
            aria-label="Alert direction"
            className="inline-flex flex-none rounded-lg border border-border bg-surface p-0.5"
          >
            {DIRECTIONS.map((d) => {
              const active = d.value === direction;
              return (
                <button
                  key={d.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setDirection(d.value)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active ? "bg-fg text-bg" : "text-muted hover:text-fg",
                  )}
                >
                  {d.label}
                </button>
              );
            })}
          </div>

          <div className="relative flex-1">
            <input
              value={targetStr}
              onChange={(e) => {
                setTargetStr(e.target.value);
                if (error) setError(null);
              }}
              inputMode="decimal"
              placeholder="Target rate"
              aria-label={`Target rate in ${toSym} per ${fromSym}`}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 pr-14 font-mono text-sm tabular text-fg outline-none transition-colors focus:border-brand"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">
              {toSym}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="truncate text-muted">
            {currentRate != null
              ? `Now: ${formatRateLine(currentRate, fromSym, toSym)}`
              : "Live rate unavailable for this pair right now."}
          </span>
          {currentRate != null && (
            <button
              type="button"
              onClick={useCurrent}
              className="flex-none font-medium text-fg transition-colors hover:text-brand"
            >
              Use current
            </button>
          )}
        </div>

        {willTriggerNow && (
          <p className="text-xs text-brand">
            Heads up — the rate already meets this, so the alert triggers on the next check.
          </p>
        )}
      </div>

      {/* Repeat */}
      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={repeat}
          onChange={(e) => setRepeat(e.target.checked)}
          className="mt-0.5 h-4 w-4 flex-none accent-brand"
        />
        <span className="text-sm text-fg">
          Keep watching after it triggers
          <span className="block text-xs text-muted">
            Re-arms only after the rate crosses back past your target, so it won&rsquo;t spam you.
          </span>
        </span>
      </label>

      {/* Note */}
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={80}
        placeholder="Note (optional) — e.g. “buy zone”"
        aria-label="Alert note"
        className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg outline-none transition-colors focus:border-brand placeholder:text-muted"
      />

      {error && <p className="text-sm text-down">{error}</p>}

      <button
        type="submit"
        disabled={from === to || !targetValid}
        className="w-full rounded-lg bg-fg px-3 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Set alert
      </button>

      <NotificationNotice />
    </form>
  );
}

/**
 * Honest, actionable line about browser-notification permission. Alerts always
 * show in-app; this just governs the extra OS-level notification.
 */
function NotificationNotice() {
  const [perm, setPerm] = useState<NotificationPermission | "unsupported" | null>(
    null,
  );

  useEffect(() => {
    setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  if (perm === null) return null; // avoid SSR/client mismatch until mounted

  function enable() {
    if (typeof Notification === "undefined") return;
    void Notification.requestPermission().then((p) => {
      setPerm(p);
      useSettingsStore.getState().setNotifyEnabled(p === "granted");
    });
  }

  const base = "flex items-center gap-2 text-xs";

  if (perm === "granted") {
    return (
      <p className={cn(base, "text-muted")}>
        <CheckIcon className="h-4 w-4 text-up" />
        Browser notifications are on. Checks run while a FXPulse tab is open.
      </p>
    );
  }
  if (perm === "denied") {
    return (
      <p className={cn(base, "text-muted")}>
        <BellIcon className="h-4 w-4" />
        Browser notifications are blocked in your browser — alerts still show in-app.
      </p>
    );
  }
  if (perm === "unsupported") {
    return (
      <p className={cn(base, "text-muted")}>
        <BellIcon className="h-4 w-4" />
        This browser can&rsquo;t show notifications — alerts still show in-app.
      </p>
    );
  }
  // "default": not yet decided.
  return (
    <div className={cn(base, "justify-between text-muted")}>
      <span className="flex items-center gap-2">
        <BellIcon className="h-4 w-4" />
        Get notified even when this tab isn&rsquo;t in front.
      </span>
      <button
        type="button"
        onClick={enable}
        className="flex-none font-medium text-fg transition-colors hover:text-brand"
      >
        Enable
      </button>
    </div>
  );
}
