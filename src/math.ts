/** 0→1 ramp across [a, b], clamped. */
export function ramp(p: number, a: number, b: number): number {
  if (p <= a) return 0;
  if (p >= b) return 1;
  return (p - a) / (b - a);
}

/** Cubic ease-in-out. */
export function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Linear interpolation from a to b by t. */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Clamp to [0, 1]. */
export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Critically-damped follow (Unity's SmoothDamp): eases `current` toward `target`
 * with no overshoot — ease-in AND ease-out — carrying velocity in `velRef`
 * between calls and capping the follow speed at `maxSpeed` (units/second).
 */
export function smoothDamp(
  current: number,
  target: number,
  velRef: { current: number },
  smoothTime: number,
  dt: number,
  maxSpeed: number,
): number {
  const st = Math.max(0.0001, smoothTime);
  const omega = 2 / st;
  const x = omega * dt;
  const expo = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const maxChange = maxSpeed * st;
  const change = Math.min(maxChange, Math.max(-maxChange, current - target));
  const temp = (velRef.current + omega * change) * dt;
  velRef.current = (velRef.current - omega * temp) * expo;
  let output = current - change + (change + temp) * expo;
  if ((target - current > 0) === (output > target)) {
    output = target;
    velRef.current = (output - target) / dt;
  }
  return output;
}
