"use client";

import { useQuery } from "@tanstack/react-query";
import type { Catalog } from "@/lib/assets/catalog";

async function fetchAssets(): Promise<Catalog> {
  const res = await fetch("/api/assets");
  if (!res.ok) throw new Error(`Assets request failed (${res.status})`);
  return res.json();
}

/** The unified asset catalog (fiat + crypto + metals). Rarely changes. */
export function useAssets() {
  return useQuery({
    queryKey: ["assets"],
    queryFn: fetchAssets,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}
