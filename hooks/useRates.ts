"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchRates, sortIds } from "@/lib/rates/ratesQuery";

/**
 * Live USD-hub rates for a set of asset ids. Ids are de-duped and sorted so the
 * query key is stable regardless of argument order — and shared with the alert
 * engine, which reuses the same cache entry.
 */
export function useRates(ids: string[], refetchMs = 60_000) {
  const sorted = useMemo(() => sortIds(ids), [ids]);
  return useQuery({
    queryKey: ["rates", sorted],
    queryFn: () => fetchRates(sorted),
    enabled: sorted.length > 0,
    refetchInterval: refetchMs,
    placeholderData: (prev) => prev,
  });
}
