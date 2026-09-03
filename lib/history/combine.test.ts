import { describe, it, expect } from "vitest";
import {
  bucketByUtcDay,
  forwardFill,
  fiatUsdByDay,
  combineUsdSeries,
} from "./combine";
import type { FrankfurterTimeSeries } from "@/lib/api/frankfurter";

const D1 = "2024-01-01";
const D2 = "2024-01-02"; // a weekend gap for fiat
const D3 = "2024-01-03";

describe("bucketByUtcDay", () => {
  it("keeps the last point seen within a UTC day", () => {
    const out = bucketByUtcDay([
      [Date.UTC(2024, 0, 1, 10), 1.1],
      [Date.UTC(2024, 0, 1, 20), 1.2], // later same-day point wins
      [Date.UTC(2024, 0, 2, 5), 2.0],
    ]);
    expect(out).toEqual({ "2024-01-01": 1.2, "2024-01-02": 2.0 });
  });

  it("skips non-finite values", () => {
    const out = bucketByUtcDay([
      [Date.UTC(2024, 0, 1, 10), NaN],
      [Date.UTC(2024, 0, 1, 11), Infinity],
      [Date.UTC(2024, 0, 1, 12), 3.3],
    ]);
    expect(out).toEqual({ "2024-01-01": 3.3 });
  });
});

describe("forwardFill", () => {
  it("carries the last known value across gaps", () => {
    expect(forwardFill([D1, D2, D3], { [D1]: 10, [D3]: 30 })).toEqual({
      [D1]: 10,
      [D2]: 10, // filled
      [D3]: 30,
    });
  });

  it("does not fabricate a value before the first known point", () => {
    expect(forwardFill([D1, D2, D3], { [D2]: 5 })).toEqual({
      [D2]: 5,
      [D3]: 5,
    });
  });
});

describe("fiatUsdByDay", () => {
  const ts: FrankfurterTimeSeries = {
    amount: 1,
    base: "USD",
    start_date: D1,
    end_date: D1,
    rates: {
      [D1]: { EUR: 0.8, JPY: 150, BAD: 0 },
    },
  };

  it("returns a constant 1 for USD without touching the series", () => {
    expect(fiatUsdByDay(null, "USD", [D1, D2])).toEqual({ [D1]: 1, [D2]: 1 });
  });

  it("inverts 'code per USD' into a USD price per unit", () => {
    const out = fiatUsdByDay(ts, "EUR", [D1]);
    expect(out[D1]).toBeCloseTo(1 / 0.8, 10); // $1.25 per EUR
  });

  it("drops non-positive upstream rates", () => {
    expect(fiatUsdByDay(ts, "BAD", [D1])).toEqual({});
  });

  it("returns empty when the series is missing", () => {
    expect(fiatUsdByDay(null, "EUR", [D1])).toEqual({});
  });
});

describe("combineUsdSeries", () => {
  it("divides the two USD legs per aligned day", () => {
    const from = { [D1]: 1, [D2]: 1, [D3]: 1 }; // USD
    const to = { [D1]: 1.25, [D2]: 1.25, [D3]: 1.25 }; // EUR at $1.25
    const { points, hasGaps } = combineUsdSeries(from, to, [D1, D2, D3]);
    expect(points).toHaveLength(3);
    expect(points[0]).toEqual({ date: D1, value: 0.8 });
    expect(hasGaps).toBe(false);
  });

  it("flags a gap when a leg only has a value via forward-fill", () => {
    const from = { [D1]: 1, [D2]: 1, [D3]: 1 }; // USD every day
    const to = { [D1]: 1.25 }; // EUR only on D1 (weekend gap after)
    const { points, hasGaps } = combineUsdSeries(from, to, [D1, D2, D3]);
    expect(points).toHaveLength(3); // filled forward
    expect(points.map((p) => p.value)).toEqual([0.8, 0.8, 0.8]);
    expect(hasGaps).toBe(true);
  });

  it("skips days with no usable value on either leg", () => {
    const { points, hasGaps } = combineUsdSeries({}, { [D1]: 1.25 }, [D1]);
    expect(points).toHaveLength(0);
    expect(hasGaps).toBe(true);
  });
});
