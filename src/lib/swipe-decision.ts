/** Preserve vertical scrolling and ignore short or diagonal pointer movements. */
export function swipeDecision(dx: number, dy: number): "pass" | "interested" | null {
  if (
    !Number.isFinite(dx) ||
    !Number.isFinite(dy) ||
    Math.abs(dx) < 100 ||
    Math.abs(dy) > Math.abs(dx) * 0.6
  )
    return null;
  return dx > 0 ? "interested" : "pass";
}
