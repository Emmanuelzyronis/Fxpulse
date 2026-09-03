/** One recorded conversion, appended when the user commits a conversion. */
export interface LogEntry {
  id: string;
  from: string;
  to: string;
  /** Input amount, in units of `from`. */
  amount: number;
  /** Converted amount, in units of `to`. */
  result: number;
  /** Rate used: units of `to` per 1 unit of `from`. */
  rate: number;
  /** Epoch ms. */
  at: number;
}
