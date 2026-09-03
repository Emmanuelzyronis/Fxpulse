import { cn } from "@/lib/cn";
import { formatPercent } from "@/lib/format/number";

interface DeltaChipProps {
  /** Percent change; positive is "up". Null renders nothing. */
  change: number | null | undefined;
  /** Show the "24h" qualifier after the percent. */
  windowLabel?: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Signed percent pill in the market up/down hues. These colors are reserved for
 * live market movement — never for interaction state — so a green/red chip
 * always means "the number moved," nothing else.
 */
export function DeltaChip({ change, windowLabel, size = "md", className }: DeltaChipProps) {
  if (change == null || !Number.isFinite(change)) return null;
  const up = change > 0;
  const down = change < 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md font-mono font-medium tabular",
        size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-0.5 text-sm",
        up && "bg-up/10 text-up",
        down && "bg-down/10 text-down",
        !up && !down && "bg-surface-2 text-muted",
        className,
      )}
    >
      <span aria-hidden="true">{up ? "▲" : down ? "▼" : "•"}</span>
      {formatPercent(change)}
      {windowLabel && <span className="font-sans text-muted">{windowLabel}</span>}
    </span>
  );
}
