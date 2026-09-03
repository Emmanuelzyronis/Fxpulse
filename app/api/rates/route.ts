import { NextResponse, type NextRequest } from "next/server";
import { assembleRates } from "@/lib/rates/normalize";
import { isAssetId } from "@/lib/assets/ids";

export const dynamic = "force-dynamic";

const MAX_IDS = 60;

/**
 * GET /api/rates?ids=fiat:USD,crypto:bitcoin,metal:XAU
 * Returns a unified USD-hub rate map for the requested assets.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("ids") ?? "";
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ error: "missing_ids" }, { status: 400 });
  }
  if (ids.length > MAX_IDS) {
    return NextResponse.json({ error: "too_many_ids", max: MAX_IDS }, { status: 400 });
  }
  const invalid = ids.filter((id) => !isAssetId(id));
  if (invalid.length) {
    return NextResponse.json({ error: "invalid_ids", invalid }, { status: 400 });
  }

  try {
    const rates = await assembleRates(ids);
    return NextResponse.json(rates, {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "rates_unavailable";
    return NextResponse.json({ error: "rates_unavailable", message }, { status: 502 });
  }
}
