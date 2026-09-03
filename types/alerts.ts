export type AlertDirection = "above" | "below";
export type AlertStatus = "active" | "triggered";

/**
 * A client-side rate alert. Evaluated by the alert engine while a tab is open.
 * `repeat` alerts re-arm only after the rate crosses back past the target
 * (hysteresis) to avoid flapping.
 */
export interface RateAlert {
  id: string;
  from: string;
  to: string;
  direction: AlertDirection;
  /** Target rate: units of `to` per 1 unit of `from`. */
  target: number;
  repeat: boolean;
  status: AlertStatus;
  createdAt: number;
  /** Epoch ms when it last fired (persisted so reloads don't re-toast). */
  triggeredAt?: number;
  /** Last observed rate, used for hysteresis re-arming. */
  lastValue?: number;
  note?: string;
}
