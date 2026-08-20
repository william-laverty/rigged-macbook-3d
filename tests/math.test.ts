import { describe, it, expect } from 'vitest';
import { ramp, easeInOut, lerp, clamp01, smoothDamp } from '../src/math';

describe('ramp', () => {
  it('is 0 before a, 1 after b, linear between', () => {
    expect(ramp(0.1, 0.2, 0.6)).toBe(0);
    expect(ramp(0.7, 0.2, 0.6)).toBe(1);
    expect(ramp(0.4, 0.2, 0.6)).toBeCloseTo(0.5);
  });
});

describe('easeInOut', () => {
  it('fixes endpoints and midpoint', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5);
  });
  it('is symmetric', () => {
    expect(easeInOut(0.25) + easeInOut(0.75)).toBeCloseTo(1);
  });
});

describe('lerp / clamp01', () => {
  it('lerps', () => expect(lerp(2, 4, 0.5)).toBe(3));
  it('clamps', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(0.4)).toBe(0.4);
  });
});

describe('smoothDamp', () => {
  it('converges to the target without overshoot', () => {
    let current = 0;
    const vel = { current: 0 };
    let overshot = false;
    for (let i = 0; i < 300; i++) {
      current = smoothDamp(current, 1, vel, 0.3, 1 / 60, 10);
      if (current > 1 + 1e-9) overshot = true;
    }
    expect(overshot).toBe(false);
    expect(current).toBeCloseTo(1, 3);
  });
  it('respects the speed cap', () => {
    let current = 0;
    const vel = { current: 0 };
    const dt = 1 / 60;
    const maxSpeed = 0.5;
    for (let i = 0; i < 60; i++) current = smoothDamp(current, 100, vel, 0.1, dt, maxSpeed);
    // After 1 simulated second at cap 0.5/s, we can have moved at most ~0.5 (+tolerance).
    expect(current).toBeLessThanOrEqual(0.6);
  });
});
