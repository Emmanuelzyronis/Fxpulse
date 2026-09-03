/**
 * A quiet "the tape is live" indicator. The heartbeat uses the market-up hue
 * because it signals live data (distinct from the gold interaction accent).
 * The app polls upstreams only while a tab is open — this doesn't claim more.
 */
export function LiveStatus() {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-muted">
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-up/60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-up" />
      </span>
      <span className="hidden sm:inline">Live rates</span>
    </span>
  );
}
