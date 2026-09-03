import type { AssetKind } from "@/types/asset";

export const ASSET_KINDS: AssetKind[] = ["fiat", "crypto", "metal"];

/** Build a namespaced asset id, e.g. makeId("fiat", "USD") -> "fiat:USD". */
export function makeId(kind: AssetKind, upstreamId: string): string {
  return `${kind}:${upstreamId}`;
}

/** Parse a namespaced asset id back into its parts. */
export function parseId(id: string): { kind: AssetKind; upstreamId: string } {
  const idx = id.indexOf(":");
  if (idx === -1) {
    throw new Error(`Invalid asset id: ${id}`);
  }
  return {
    kind: id.slice(0, idx) as AssetKind,
    upstreamId: id.slice(idx + 1),
  };
}

/** True when `id` is a syntactically valid, known-kind asset id. */
export function isAssetId(id: string): boolean {
  const idx = id.indexOf(":");
  if (idx <= 0 || idx === id.length - 1) return false;
  return ASSET_KINDS.includes(id.slice(0, idx) as AssetKind);
}

/** Stable id for a directed pair, used by favorites/alerts. */
export function pairId(from: string, to: string): string {
  return `${from}__${to}`;
}
