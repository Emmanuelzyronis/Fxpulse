export type ThemePref = "light" | "dark" | "system";

/** Auto precision sentinel: pick decimals from the result magnitude. */
export const AUTO_PRECISION = -1;

export interface Settings {
  /** Default "from" asset id for the converter. */
  baseId: string;
  /** Default "to" asset id for the converter. */
  quoteId: string;
  /** Decimal places for results, or AUTO_PRECISION for magnitude-based. */
  precision: number;
  theme: ThemePref;
  /** Alert engine poll interval in seconds (floored at 30). */
  alertIntervalSec: number;
  /** Whether browser notifications are desired (still gated on permission). */
  notifyEnabled: boolean;
}
