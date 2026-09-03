import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/assets/catalog";

export const dynamic = "force-dynamic";

/** GET /api/assets — the unified asset catalog (fiat + crypto + metals). */
export async function GET() {
  const catalog = await getCatalog();
  return NextResponse.json(catalog, {
    headers: {
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
