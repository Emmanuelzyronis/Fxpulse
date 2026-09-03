"use client";

import { useQuery } from "@tanstack/react-query";
import type { HistoryRange, HistorySeries } from "@/types/history";

/** Fetch one pair's daily-close series from the caching proxy. */
export async function fetchHistory(
  from: string,
  to: string,
  range: HistoryRange,
): Promise<HistorySeries> {
  const params = new URLSearchParams({ from, to, range });
  const res = await fetch(`/api/history?${params.toString()}`);
  if (!res.ok) throw new Error(`History request failed (${res.status})`);
  return res.json();
}

/** Daily-close history for a single pair over a timeframe. */
export function useHistory(from: string, to: string, range: HistoryRange) {
  return useQuery({
    queryKey: ["history", from, to, range],
    queryFn: () => fetchHistory(from, to, range),
    enabled: Boolean(from) && Boolean(to) && from !== to,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}
