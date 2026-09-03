/** A pinned currency pair the user wants quick access to. */
export interface FavoritePair {
  /** Stable id derived from the pair, `${from}__${to}`. */
  id: string;
  from: string;
  to: string;
  createdAt: number;
}
