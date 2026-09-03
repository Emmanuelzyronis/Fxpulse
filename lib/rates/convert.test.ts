import { describe, it, expect } from "vitest";
import { rateOf, convert, canConvert, usdPriceOf, MissingRateError } from "./convert";
import type { UnifiedRates } from "@/types/rates";

/** Build a UnifiedRates from a plain { id: usdPrice } map. */
function makeRates(map: Record<string, number>): UnifiedRates {
  const rates: UnifiedRates["rates"] = {};
  for (const [id, usdPrice] of Object.entries(map)) {
    rates[id] = { usdPrice, source: "frankfurter", asOf: 0 };
  }
  return { base: "USD", rates, fetchedAt: 0 };
}

// usdPrice = USD per 1 unit of the asset. USD is exactly 1.
const R = makeRates({
  "fiat:USD": 1,
  "fiat:EUR": 1.25, // 1 EUR = $1.25
  "fiat:GBP": 1.6, // 1 GBP = $1.60
  "fiat:JPY": 0.0066,
  "crypto:bitcoin": 70000,
});

describe("rateOf — cross rates from USD prices", () => {
  it("is exactly 1 for identical ids, even when absent from the map", () => {
    expect(rateOf("fiat:USD", "fiat:USD", R)).toBe(1);
    expect(rateOf("fiat:ZZZ", "fiat:ZZZ", R)).toBe(1);
  });

  it("computes units of `to` per 1 `from`", () => {
    // 1 USD in EUR = 1 / 1.25 = 0.8
    expect(rateOf("fiat:USD", "fiat:EUR", R)).toBeCloseTo(0.8, 10);
    // 1 EUR in USD = 1.25
    expect(rateOf("fiat:EUR", "fiat:USD", R)).toBeCloseTo(1.25, 10);
  });

  it("triangulates two non-USD legs consistently", () => {
    // 1 EUR in GBP = 1.25 / 1.6
    const eurGbp = rateOf("fiat:EUR", "fiat:GBP", R);
    expect(eurGbp).toBeCloseTo(1.25 / 1.6, 10);
    // Chaining through USD must agree.
    const chained = rateOf("fiat:EUR", "fiat:USD", R) * rateOf("fiat:USD", "fiat:GBP", R);
    expect(eurGbp).toBeCloseTo(chained, 10);
  });

  it("is self-inverse: rate(a,b) * rate(b,a) ≈ 1", () => {
    for (const [a, b] of [
      ["fiat:USD", "fiat:EUR"],
      ["fiat:EUR", "fiat:GBP"],
      ["crypto:bitcoin", "fiat:JPY"],
    ] as const) {
      expect(rateOf(a, b, R) * rateOf(b, a, R)).toBeCloseTo(1, 10);
    }
  });

  it("stays finite and positive across extreme magnitude gaps (BTC ↔ JPY)", () => {
    const r = rateOf("crypto:bitcoin", "fiat:JPY", R); // ~10.6M JPY per BTC
    expect(Number.isFinite(r)).toBe(true);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeCloseTo(70000 / 0.0066, 4);
  });
});

describe("convert", () => {
  it("scales by the rate", () => {
    expect(convert(100, "fiat:USD", "fiat:EUR", R)).toBeCloseTo(80, 10);
    expect(convert(0, "fiat:USD", "fiat:EUR", R)).toBe(0);
  });

  it("returns NaN for a non-finite amount rather than throwing", () => {
    expect(convert(NaN, "fiat:USD", "fiat:EUR", R)).toBeNaN();
    expect(convert(Infinity, "fiat:USD", "fiat:EUR", R)).toBeNaN();
  });
});

describe("usdPriceOf / MissingRateError", () => {
  it("returns the stored USD price", () => {
    expect(usdPriceOf("fiat:EUR", R)).toBe(1.25);
  });

  it("throws MissingRateError for an unknown id, carrying the id", () => {
    expect(() => usdPriceOf("fiat:ZZZ", R)).toThrow(MissingRateError);
    try {
      usdPriceOf("fiat:ZZZ", R);
    } catch (e) {
      expect((e as MissingRateError).id).toBe("fiat:ZZZ");
    }
  });

  it("rejects non-positive or non-finite prices", () => {
    const bad = makeRates({ "fiat:USD": 1, "fiat:BAD": 0, "fiat:NEG": -2 });
    expect(() => usdPriceOf("fiat:BAD", bad)).toThrow(MissingRateError);
    expect(() => usdPriceOf("fiat:NEG", bad)).toThrow(MissingRateError);
  });
});

describe("canConvert", () => {
  it("is true when both legs have usable prices", () => {
    expect(canConvert("fiat:USD", "crypto:bitcoin", R)).toBe(true);
  });

  it("is false when either leg is missing", () => {
    expect(canConvert("fiat:USD", "fiat:ZZZ", R)).toBe(false);
    expect(canConvert("fiat:ZZZ", "fiat:USD", R)).toBe(false);
  });
});
