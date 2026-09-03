import { describe, it, expect } from "vitest";
import { evaluateAlert } from "./evaluate";
import type { RateAlert } from "@/types/alerts";

/** Build a RateAlert with sane defaults; override just what a case cares about. */
function makeAlert(partial: Partial<RateAlert> = {}): RateAlert {
  return {
    id: "a1",
    from: "fiat:USD",
    to: "fiat:EUR",
    direction: "above",
    target: 0.9,
    repeat: false,
    status: "active",
    createdAt: 0,
    ...partial,
  };
}

describe("evaluateAlert — active alerts fire on threshold", () => {
  it("fires an 'above' alert when the rate reaches the target exactly", () => {
    expect(evaluateAlert(makeAlert({ direction: "above", target: 0.9 }), 0.9)).toBe("fire");
  });

  it("fires an 'above' alert when the rate exceeds the target", () => {
    expect(evaluateAlert(makeAlert({ direction: "above", target: 0.9 }), 0.95)).toBe("fire");
  });

  it("does not fire an 'above' alert below the target", () => {
    expect(evaluateAlert(makeAlert({ direction: "above", target: 0.9 }), 0.89)).toBe("none");
  });

  it("fires a 'below' alert when the rate reaches the target exactly", () => {
    expect(evaluateAlert(makeAlert({ direction: "below", target: 0.9 }), 0.9)).toBe("fire");
  });

  it("fires a 'below' alert when the rate drops under the target", () => {
    expect(evaluateAlert(makeAlert({ direction: "below", target: 0.9 }), 0.85)).toBe("fire");
  });

  it("does not fire a 'below' alert above the target", () => {
    expect(evaluateAlert(makeAlert({ direction: "below", target: 0.9 }), 0.95)).toBe("none");
  });
});

describe("evaluateAlert — non-finite rates are ignored", () => {
  it.each([NaN, Infinity, -Infinity])("returns 'none' for %s", (rate) => {
    expect(evaluateAlert(makeAlert(), rate)).toBe("none");
  });
});

describe("evaluateAlert — one-shot de-dupe", () => {
  it("a triggered non-repeat alert never fires again, even while still met", () => {
    const alert = makeAlert({ status: "triggered", repeat: false, direction: "above", target: 0.9 });
    expect(evaluateAlert(alert, 0.95)).toBe("none");
  });

  it("a triggered non-repeat alert does not re-arm when the rate crosses back", () => {
    const alert = makeAlert({ status: "triggered", repeat: false, direction: "above", target: 0.9 });
    expect(evaluateAlert(alert, 0.5)).toBe("none");
  });
});

describe("evaluateAlert — repeat hysteresis", () => {
  it("does not re-arm an 'above' repeat alert while the rate is still at/over target", () => {
    const alert = makeAlert({ status: "triggered", repeat: true, direction: "above", target: 0.9 });
    expect(evaluateAlert(alert, 0.9)).toBe("none");
    expect(evaluateAlert(alert, 0.95)).toBe("none");
  });

  it("re-arms an 'above' repeat alert only after the rate crosses back below target", () => {
    const alert = makeAlert({ status: "triggered", repeat: true, direction: "above", target: 0.9 });
    expect(evaluateAlert(alert, 0.89)).toBe("rearm");
  });

  it("does not re-arm a 'below' repeat alert while the rate is still at/under target", () => {
    const alert = makeAlert({ status: "triggered", repeat: true, direction: "below", target: 0.9 });
    expect(evaluateAlert(alert, 0.9)).toBe("none");
    expect(evaluateAlert(alert, 0.85)).toBe("none");
  });

  it("re-arms a 'below' repeat alert only after the rate crosses back above target", () => {
    const alert = makeAlert({ status: "triggered", repeat: true, direction: "below", target: 0.9 });
    expect(evaluateAlert(alert, 0.91)).toBe("rearm");
  });
});
