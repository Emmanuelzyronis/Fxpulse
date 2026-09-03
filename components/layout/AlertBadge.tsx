"use client";

import { useHasHydrated } from "@/hooks/useHasHydrated";
import { useAlertsStore } from "@/stores/alertsStore";
import { cn } from "@/lib/cn";

/**
 * Count of triggered-but-unread alerts, as a small gold pill. Gold because it's
 * an app/notification signal (not market data, which owns green/red). Renders
 * nothing until the store hydrates or when the count is zero, so it never
 * flashes a stale number on load.
 */
export function AlertBadge({ className }: { className?: string }) {
  const hydrated = useHasHydrated();
  const count = useAlertsStore((s) =>
    s.alerts.reduce((n, a) => (a.status === "triggered" ? n + 1 : n), 0),
  );

  if (!hydrated || count === 0) return null;

  return (
    <span
      className={cn(
        "inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-none text-bg tabular",
        className,
      )}
      aria-label={`${count} triggered ${count === 1 ? "alert" : "alerts"}`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
