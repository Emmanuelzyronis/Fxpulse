import { describe, it, expect } from "vitest";
import { normalizeSeries, seriesChangePct, type NamedSeries } from "./normalizeSeries";

const D1 = "2024-01-01";
const D2 = "2024-01-02";
const D3 = "2024-01-03";

const single: NamedSeries[] = [
  { id: "a", label: "A", points: [{ date: D1, value: 50 }, { date: D2, value: 75 }] },
];

describe("normalizeSeries — modes", () => {
  it("absolute keeps raw values", () => {
    const { rows, seriesIds } = normalizeSeries(single, "absolute");
    expect(seriesIds).toEqual(["a"]);
    expect(rows).toEqual([
      { date: D1, a: 50 },
      { date: D2, a: 75 },
    ]);
  });

  it("index100 rebases each series to 100 at its first point", () => {
    const { rows } = normalizeSeries(single, "index100");
    expect(rows[0].a).toBeCloseTo(100, 10);
    expect(rows[1].a).toBeCloseTo(150, 10); // 75/50*100
  });

  it("pct shows percent change from the first point", () => {
    const { rows } = normalizeSeries(single, "pct");
    expect(rows[0].a).toBeCloseTo(0, 10);
    expect(rows[1].a).toBeCloseTo(50, 10); // (75/50-1)*100
  });
});

describe("normalizeSeries — alignment across series", () => {
  it("builds a shared, sorted date axis and forward-fills each series", () => {
    const series: NamedSeries[] = [
      { id: "a", label: "A", points: [{ date: D1, value: 10 }, { date: D3, value: 20 }] },
      { id: "b", label: "B", points: [{ date: D2, value: 5 }] },
    ];
    const { rows } = normalizeSeries(series, "absolute");
    expect(rows.map((r) => r.date)).toEqual([D1, D2, D3]);
    // b has no value before D2; a is forward-filled after D1.
    expect(rows[0]).toEqual({ date: D1, a: 10 });
    expect(rows[1]).toEqual({ date: D2, a: 10, b: 5 });
    expect(rows[2]).toEqual({ date: D3, a: 20, b: 5 });
  });
});

describe("seriesChangePct", () => {
  it("computes first→last percent change", () => {
    expect(
      seriesChangePct([{ date: D1, value: 100 }, { date: D2, value: 150 }]),
    ).toBeCloseTo(50, 10);
  });

  it("returns 0 for fewer than two points or a zero baseline", () => {
    expect(seriesChangePct([{ date: D1, value: 100 }])).toBe(0);
    expect(seriesChangePct([])).toBe(0);
    expect(seriesChangePct([{ date: D1, value: 0 }, { date: D2, value: 5 }])).toBe(0);
  });
});
