import { QueryClient } from "@tanstack/react-query";

/**
 * Shared QueryClient config. Rates are cheap to keep warm but shouldn't refetch
 * aggressively (CoinGecko rate limits); the alert engine drives its own polling.
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: 2,
        retryDelay: (attempt) => Math.min(30_000, 1000 * 2 ** attempt),
        refetchOnWindowFocus: false,
      },
    },
  });
}
