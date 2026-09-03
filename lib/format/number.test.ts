import { describe, it, expect } from "vitest";
import {
  autoDecimals,
  formatAmount,
  formatPercent,
  parseAmount,
} from "./number";
import { AUTO_PRECISION } from "@/types/settings";

describe("autoDecimals — precision from magnitude", () => {
  it("uses 2 places for large values", () => {
    expect(autoDecimals(1234.5)).toBe(2);
    expect(autoDecimals(1000)).toBe(2);
  });

  it("uses 4 places for near-unit values", () => {
    expect(autoDecimals(80)).toBe(4);
    expect(autoDecimals(1)).toBe(4);
  });

  it("uses 6 places for small values", () => {
    expect(autoDecimals(0.8631)).toBe(6);
    expect(autoDecimals(0.01)).toBe(6);
  });

  it("adds significant figures past the leading zeros for tiny values", () => {
    // 0.00002 → ~4 sig figs after 4 leading zeros
    expect(autoDecimals(0.00002)).toBe(8);
  });

  it("caps very tiny values at 12 places and defaults zero/NaN to 2", () => {
    expect(autoDecimals(1e-20)).toBe(12);
    expect(autoDecimals(0)).toBe(2);
    expect(autoDecimals(NaN)).toBe(2);
  });
});

describe("formatAmount", () => {
  it("returns an em dash for non-finite input", () => {
    expect(formatAmount(NaN)).toBe("—");
    expect(formatAmount(Infinity)).toBe("—");
  });

  it("drops trailing zeros for integers under auto precision", () => {
    expect(formatAmount(80, { grouping: false })).toBe("80");
  });

  it("honors a fixed precision", () => {
    expect(formatAmount(1.23456, { precision: 2, grouping: false })).toBe("1.23");
  });

  it("appends a symbol when given", () => {
    expect(formatAmount(80, { grouping: false, symbol: "EUR" })).toBe("80 EUR");
  });

  it("groups thousands by default (separator is locale-dependent)", () => {
    // Grouping inserts separators, so the string is longer than the bare digits.
    const grouped = formatAmount(1234567, { precision: 0 });
    expect(grouped.length).toBeGreaterThan("1234567".length);
    expect(formatAmount(1234567, { precision: 0, grouping: false }).length).toBe(7);
  });

  it("treats AUTO_PRECISION as the auto path", () => {
    expect(formatAmount(0.8631, { precision: AUTO_PRECISION, grouping: false })).toBe(
      "0.8631",
    );
  });
});

describe("formatPercent", () => {
  it("prefixes a plus sign for positive values", () => {
    expect(formatPercent(1.2345)).toBe("+1.23%");
  });

  it("keeps the native minus for negatives and no sign for zero", () => {
    expect(formatPercent(-0.3)).toBe("-0.30%");
    expect(formatPercent(0)).toBe("0.00%");
  });

  it("returns an em dash for non-finite input", () => {
    expect(formatPercent(NaN)).toBe("—");
  });
});

describe("parseAmount", () => {
  it("parses plain and grouped numbers", () => {
    expect(parseAmount("1234.5")).toBe(1234.5);
    expect(parseAmount("1,234.5")).toBe(1234.5);
    expect(parseAmount(" 1 000 ")).toBe(1000);
  });

  it("returns NaN for blank or unparseable input", () => {
    expect(parseAmount("")).toBeNaN();
    expect(parseAmount("   ")).toBeNaN();
    expect(parseAmount("abc")).toBeNaN();
  });
});
