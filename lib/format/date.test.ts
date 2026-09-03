import { describe, it, expect } from "vitest";
import {
  toUtcDay,
  fromUtcDay,
  dayDiff,
  eachUtcDay,
  rangeStart,
  relativeTime,
} from "./date";

describe("toUtcDay / fromUtcDay", () => {
  it("formats the UTC calendar day of an epoch", () => {
    expect(toUtcDay(0)).toBe("1970-01-01");
    expect(toUtcDay(Date.UTC(2024, 0, 15, 23, 59))).toBe("2024-01-15");
  });

  it("accepts a Date as well as a number", () => {
    expect(toUtcDay(new Date(Date.UTC(2024, 5, 1)))).toBe("2024-06-01");
  });

  it("round-trips a day string to UTC midnight", () => {
    expect(fromUtcDay("1970-01-01")).toBe(0);
    expect(fromUtcDay("2024-01-15")).toBe(Date.UTC(2024, 0, 15));
  });
});

describe("dayDiff / eachUtcDay", () => {
  it("counts whole days between two day strings", () => {
    expect(dayDiff("2024-01-01", "2024-01-08")).toBe(7);
    expect(dayDiff("2024-01-08", "2024-01-01")).toBe(-7);
  });

  it("lists an inclusive range of UTC days", () => {
    expect(eachUtcDay("2024-01-01", "2024-01-03")).toEqual([
      "2024-01-01",
      "2024-01-02",
      "2024-01-03",
    ]);
    expect(eachUtcDay("2024-01-01", "2024-01-01")).toEqual(["2024-01-01"]);
  });
});

describe("rangeStart", () => {
  const now = Date.UTC(2024, 5, 15); // 2024-06-15

  it("subtracts the window for rolling ranges", () => {
    expect(rangeStart("7d", now)).toBe(toUtcDay(now - 7 * 86400000));
    expect(rangeStart("30d", now)).toBe(toUtcDay(now - 30 * 86400000));
    expect(rangeStart("1y", now)).toBe(toUtcDay(now - 365 * 86400000));
  });

  it("anchors ytd to Jan 1 of the current UTC year", () => {
    expect(rangeStart("ytd", now)).toBe("2024-01-01");
  });

  it("falls back to 30 days for an unknown range", () => {
    expect(rangeStart("bogus", now)).toBe(toUtcDay(now - 30 * 86400000));
  });
});

describe("relativeTime", () => {
  const now = Date.UTC(2024, 0, 2, 12, 0, 0);

  it("labels sub-minute deltas as 'just now'", () => {
    expect(relativeTime(now - 30_000, now)).toBe("just now");
    expect(relativeTime(now + 5_000, now)).toBe("just now"); // future clamps to 0
  });

  it("labels minutes, hours, and days", () => {
    expect(relativeTime(now - 3 * 60_000, now)).toBe("3m ago");
    expect(relativeTime(now - 2 * 3_600_000, now)).toBe("2h ago");
    expect(relativeTime(now - 3 * 86_400_000, now)).toBe("3d ago");
  });
});
