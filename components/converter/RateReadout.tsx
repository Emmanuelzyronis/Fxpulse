"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { formatAmount, formatRateLine } from "@/lib/format/number";
import { Skeleton } from "@/components/common/Skeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { StaleBadge } from "@/components/common/StaleBadge";
import { DeltaChip } from "@/components/common/DeltaChip";

interface RateReadoutProps {
  fromSymbol: string;
  toSymbol: string;
  rate: number | null;
  change24h: number | null;
  asOf: number | null;
  isStale: boolean;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

/**
 * The hero: a live rate readout (not a form). The rate is the largest thing on
 * the page; when it changes, the digits flash up/down once — the app's single
 * signature motion, and the reason it's called FXPulse. Reduced-motion users get
 * the color without the animation (handled in globals.css).
 */
export function RateReadout({
  fromSymbol,
  toSymbol,
  rate,
  change24h,
  asOf,
  isStale,
  isLoading,
  isError,
  onRetry,
}: RateReadoutProps) {
  // Retrigger the flash on every distinct rate by remounting the number span
  // (keyed on an incrementing counter) and setting the direction class.
  const prev = useRef<number | null>(null);
  const counter = useRef(0);
  const [flash, setFlash] = useState<{ cls: string; key: number } | null>(null);

  useEffect(() => {
    if (rate == null) return;
    const p = prev.current;
    prev.current = rate;
    if (p != null && rate !== p) {
      counter.current += 1;
      setFlash({ cls: rate > p ? "tick-up" : "tick-down", key: counter.current });
    }
  }, [rate]);

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-panel sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-baseline gap-2 font-mono text-sm">
          <span className="font-semibold text-fg">{fromSymbol}</span>
          <span className="text-muted">/</span>
          <span className="font-semibold text-fg">{toSymbol}</span>
        </div>
        <StaleBadge asOf={asOf} stale={isStale} />
      </div>

      {isError && rate == null ? (
        <div className="mt-4">
          <ErrorState onRetry={onRetry} />
        </div>
      ) : isLoading && rate == null ? (
        <div className="mt-3 space-y-3">
          <Skeleton className="h-12 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2">
            <span
              key={flash?.key ?? "static"}
              className={cn(
                "-mx-1 rounded px-1 font-mono text-4xl font-semibold tabular text-fg sm:text-5xl",
                flash?.cls,
              )}
            >
              {rate == null ? "—" : formatAmount(rate)}
            </span>
            <DeltaChip change={change24h} windowLabel="24h" className="mb-1.5" />
          </div>

          <p className="mt-2 font-mono text-sm text-muted">
            {rate == null ? `1 ${fromSymbol} = —` : formatRateLine(rate, fromSymbol, toSymbol)}
          </p>
        </>
      )}
    </section>
  );
}
