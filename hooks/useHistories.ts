"use client";

import { useQueries } from "@tanstack/react-query";
import type { HistoryRange, HistorySeries } from "@/types/history";
import { fetchHistory } from "./useHistory";

/** One pair to chart, with a stable id and a display label. */
export interface HistoryPairInput {
  id: string;
  from: string;
  to: string;
  label: string;
}

export interface HistoryQueryResult {
  input: HistoryPairInput;
  data: HistorySeries | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * Fetch several pairs in parallel for overlay charts. Uses `useQueries` so the
 * number of pairs can vary without breaking the rules of hooks; each query is
 * cached under the same key as `useHistory`, so a pair charted here and on the
 * converter shares one request.
 */
export function useHistories(
  pairs: HistoryPairInput[],
  range: HistoryRange,
): HistoryQueryResult[] {
  const results = useQueries({
    queries: pairs.map((p) => ({
      queryKey: ["history", p.from, p.to, range],
      queryFn: () => fetchHistory(p.from, p.to, range),
      enabled: Boolean(p.from) && Boolean(p.to) && p.from !== p.to,
      staleTime: 5 * 60 * 1000,
      placeholderData: (prev: HistorySeries | undefined) => prev,
    })),
  });

  return results.map((r, i) => ({
    input: pairs[i],
    data: r.data,
    isLoading: r.isLoading,
    isError: r.isError,
    refetch: r.refetch,
  }));
}
