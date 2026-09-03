import { describe, it, expect } from "vitest";
import { csvField, toCsv } from "./csv";

describe("csvField", () => {
  it("leaves simple values unquoted", () => {
    expect(csvField("plain")).toBe("plain");
    expect(csvField(42)).toBe("42");
  });

  it("renders null and undefined as empty", () => {
    expect(csvField(null)).toBe("");
    expect(csvField(undefined)).toBe("");
  });

  it("quotes fields containing a comma, newline, or carriage return", () => {
    expect(csvField("a,b")).toBe('"a,b"');
    expect(csvField("line\nbreak")).toBe('"line\nbreak"');
    expect(csvField("cr\rreturn")).toBe('"cr\rreturn"');
  });

  it("escapes embedded double quotes by doubling them", () => {
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
  });
});

describe("toCsv", () => {
  it("joins header and rows with CRLF and per-field quoting", () => {
    const out = toCsv(
      ["when", "pair", "note"],
      [
        ["2024-01-01", "USD/EUR", "ok"],
        ["2024-01-02", "USD/JPY", "has, comma"],
      ],
    );
    expect(out).toBe(
      'when,pair,note\r\n2024-01-01,USD/EUR,ok\r\n2024-01-02,USD/JPY,"has, comma"',
    );
  });

  it("emits just the header for no rows", () => {
    expect(toCsv(["a", "b"], [])).toBe("a,b");
  });
});
