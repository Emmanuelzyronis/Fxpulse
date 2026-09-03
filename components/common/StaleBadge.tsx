import { cn } from "@/lib/cn";
import { relativeTime } from "@/lib/format/date";

interface StaleBadgeProps {
  /** Epoch ms the data was "as of". */
  asOf?: number | null;
  /** Force the stale (amber) treatment regardless of age. */
  stale?: boolean;
  /** Prefix label, e.g. "ECB close" or "updated". */
  label?: string;
  className?: string;
}

/**
 * Honest data-provenance chip: a green dot for fresh, amber for stale, with a
 * relative "as of" time. Surfacing this is part of the app's trust story.
 */
export function StaleBadge({ asOf, stale, label = "updated", className }: StaleBadgeProps) {
  if (!asOf) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs",
        stale
          ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
          : "border-border bg-surface-2 text-muted",
        className,
      )}
      title={new Date(asOf).toLocaleString()}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          stale ? "bg-amber-500" : "bg-up",
        )}
      />
      {stale ? "Stale" : label} · {relativeTime(asOf)}
    </span>
  );
}
