import { describe, expect, test } from "bun:test";
import { swipeDecision } from "../src/lib/swipe-decision";

describe("discovery gestures", () => {
  test("deliberate horizontal gestures map to the visible decisions", () => {
    expect(swipeDecision(-130, 15)).toBe("pass");
    expect(swipeDecision(130, -15)).toBe("interested");
  });
  test("taps, short drags, diagonal and vertical scrolling do not decide", () => {
    for (const [dx, dy] of [
      [0, 0],
      [99, 0],
      [-99, 0],
      [120, 90],
      [-120, 90],
      [15, 300],
    ]) {
      expect(swipeDecision(dx!, dy!)).toBeNull();
    }
  });
  test("invalid pointer coordinates cannot create a decision", () => {
    expect(swipeDecision(NaN, 0)).toBeNull();
    expect(swipeDecision(Infinity, 0)).toBeNull();
    expect(swipeDecision(140, NaN)).toBeNull();
  });
});
