import type { RateAlert } from "@/types/alerts";

/**
 * Pure alert evaluation — extracted so firing / de-dupe / hysteresis logic is
 * unit-testable without the polling engine.
 *
 *  - "fire":   an active alert whose threshold is now met (fire once, then the
 *              engine marks it triggered).
 *  - "rearm":  a triggered, repeating alert whose rate has crossed back past the
 *              target (hysteresis) — safe to re-activate so it can fire again.
 *  - "none":   nothing to do.
 */
export type AlertAction = "fire" | "rearm" | "none";

export function evaluateAlert(alert: RateAlert, rate: number): AlertAction {
  if (!Number.isFinite(rate)) return "none";

  const thresholdMet =
    alert.direction === "above" ? rate >= alert.target : rate <= alert.target;

  if (alert.status === "active") {
    return thresholdMet ? "fire" : "none";
  }

  // status === "triggered"
  if (!alert.repeat) return "none";
  const crossedBack =
    alert.direction === "above" ? rate < alert.target : rate > alert.target;
  return crossedBack ? "rearm" : "none";
}
