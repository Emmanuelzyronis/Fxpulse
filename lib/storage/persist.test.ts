import { describe, it, expect, afterEach, vi } from "vitest";
import { safeStorage } from "./persist";

afterEach(() => {
  vi.restoreAllMocks();
  try {
    window.localStorage.clear();
  } catch {
    /* ignore */
  }
});

describe("safeStorage — happy path (jsdom localStorage)", () => {
  it("round-trips set / get / remove", () => {
    safeStorage.setItem("k", "v");
    expect(safeStorage.getItem("k")).toBe("v");
    safeStorage.removeItem("k");
    expect(safeStorage.getItem("k")).toBeNull();
  });

  it("returns null for a missing key", () => {
    expect(safeStorage.getItem("does-not-exist")).toBeNull();
  });
});

describe("safeStorage — never throws on a hostile localStorage", () => {
  it("falls back to memory when setItem throws (quota / private mode)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked");
    });

    // Should not throw, and the value should still be readable via fallback.
    expect(() => safeStorage.setItem("k", "fallback")).not.toThrow();
    expect(safeStorage.getItem("k")).toBe("fallback");
  });

  it("returns null (not a throw) when getItem itself throws and nothing is cached", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked");
    });
    expect(safeStorage.getItem("never-written")).toBeNull();
  });
});
