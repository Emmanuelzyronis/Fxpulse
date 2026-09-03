"use client";

import type { NormalizeMode } from "@/lib/history/normalizeSeries";
import { cn } from "@/lib/cn";

const MODES: { value: NormalizeMode; label: string; hint: string }[] = [
  { value: "absolute", label: "Absolute", hint: "Raw rate" },
  { value: "index100", label: "Index 100", hint: "Rebased to 100 at start" },
  { value: "pct", label: "% change", hint: "Percent change from start" },
];

/**
 * Chooses how overlaid series are scaled. Absolute is only sensible for a single
 * pair; once pairs of different magnitudes overlap, Index 100 / % change make
 * their moves comparable.
 */
export function NormalizeToggle({
  value,
  onChange,
  className,
}: {
  value: NormalizeMode;
  onChange: (mode: NormalizeMode) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Scale"
      className={cn(
        "inline-flex rounded-lg border border-border bg-surface p-0.5",
        className,
      )}
    >
      {MODES.map((m) => {
        const active = m.value === value;
        return (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={m.hint}
            onClick={() => onChange(m.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              active ? "bg-fg text-bg" : "text-muted hover:text-fg",
            )}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
