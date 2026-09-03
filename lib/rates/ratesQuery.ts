import type { UnifiedRates } from "@/types/rates";

/**
 * Shared client-side rates fetching, used by both `useRates` and the alert
 * engine so they hit the *same* TanStack Query cache entry. The key is sorted
 * and de-duped, so it's stable regardless of argument order.
 */

/** De-dupe + sort ids so the query key is order-independent. */
export function sortIds(ids: string[]): string[] {
  return Array.from(new Set(ids)).sort();
}

/** The canonical query key for a set of asset ids. */
export function ratesQueryKey(ids: string[]) {
  return ["rates", sortIds(ids)] as const;
}

export async function fetchRates(ids: string[]): Promise<UnifiedRates> {
  const sorted = sortIds(ids);
  const res = await fetch(`/api/rates?ids=${encodeURIComponent(sorted.join(","))}`);
  if (!res.ok) throw new Error(`Rates request failed (${res.status})`);
  return res.json();
}
