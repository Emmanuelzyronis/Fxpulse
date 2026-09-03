"use client";

import { HISTORY_RANGES, type HistoryRange } from "@/types/history";
import { cn } from "@/lib/cn";

const LABELS: Record<HistoryRange, string> = {
  "7d": "7D",
  "30d": "30D",
  "90d": "90D",
  "1y": "1Y",
  ytd: "YTD",
};

/** Segmented control for the chart timeframe. */
export function TimeframePicker({
  value,
  onChange,
  className,
}: {
  value: HistoryRange;
  onChange: (range: HistoryRange) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Timeframe"
      className={cn(
        "inline-flex rounded-lg border border-border bg-surface p-0.5",
        className,
      )}
    >
      {HISTORY_RANGES.map((r) => {
        const active = r === value;
        return (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(r)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium tabular transition-colors",
              active ? "bg-fg text-bg" : "text-muted hover:text-fg",
            )}
          >
            {LABELS[r]}
          </button>
        );
      })}
    </div>
  );
}
