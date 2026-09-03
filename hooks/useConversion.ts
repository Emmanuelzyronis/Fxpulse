"use client";

import { useMemo } from "react";
import { useRates } from "./useRates";
import { convert, rateOf, canConvert } from "@/lib/rates/convert";

export interface ConversionResult {
  /** Converted amount, or null when rates aren't available yet. */
  result: number | null;
  /** Units of `to` per 1 `from`, or null. */
  rate: number | null;
  /** 24h change of the pair's `to` leg, if the source provides it. */
  change24h: number | null;
  isLoading: boolean;
  isError: boolean;
  isStale: boolean;
  asOf: number | null;
  refetch: () => void;
}

/** Derive a live conversion for a pair + amount from the rates query. */
export function useConversion(
  fromId: string,
  toId: string,
  amount: number,
): ConversionResult {
  const ids = useMemo(() => [fromId, toId], [fromId, toId]);
  const query = useRates(ids);
  const data = query.data;

  const { result, rate } = useMemo(() => {
    if (!data || !canConvert(fromId, toId, data)) {
      return { result: null, rate: null };
    }
    return {
      result: convert(amount, fromId, toId, data),
      rate: rateOf(fromId, toId, data),
    };
  }, [data, fromId, toId, amount]);

  const change24h = data?.rates[toId]?.change24h ?? null;
  const asOf = data?.rates[toId]?.asOf ?? data?.rates[fromId]?.asOf ?? null;
  const isStale = Boolean(data?.partial?.includes(fromId) || data?.partial?.includes(toId));

  return {
    result,
    rate,
    change24h,
    isLoading: query.isLoading,
    isError: query.isError,
    isStale,
    asOf,
    refetch: () => void query.refetch(),
  };
}
