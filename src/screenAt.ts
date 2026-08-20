/**
 * Where the screen walkthrough is at progress `p`: the current screen, the one
 * blending in (always index + 1, clamped), and the raw 0–1 blend amount.
 * Consumers apply their own easing to `mix`. Use the same call for the 3D
 * crossfade and any DOM overlay (tab bars, captions) so they stay in lockstep.
 */
export function screenAt(
  p: number,
  count: number,
  band: [number, number],
  crossfadeFraction = 0.4,
): { index: number; next: number; mix: number } {
  if (count <= 1) return { index: 0, next: 0, mix: 0 };
  const [a, b] = band;
  const f = p <= a ? 0 : Math.min(((p - a) / (b - a)) * count, count - 1e-4);
  const index = Math.min(Math.floor(f), count - 1);
  const frac = f - index;
  let mix = 0;
  let next = index;
  if (frac > 1 - crossfadeFraction && index < count - 1) {
    mix = (frac - (1 - crossfadeFraction)) / crossfadeFraction;
    next = index + 1;
  }
  return { index, next, mix };
}
