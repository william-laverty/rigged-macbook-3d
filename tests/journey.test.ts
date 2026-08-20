import { describe, it, expect } from 'vitest';
import { journeyState, speedCapAt } from '../src/journey';
import { DEFAULT_TIMELINE, DEFAULT_POSES, DEFAULT_FEEL } from '../src/constants';

const state = (p: number) => journeyState(p, DEFAULT_TIMELINE, DEFAULT_POSES, 5, 0.4);

describe('journeyState', () => {
  it('starts hidden, closed, dark, in the intro pose', () => {
    const s = state(0);
    expect(s.deviceIn).toBe(0);
    expect(s.open).toBe(0);
    expect(s.brightness).toBe(0);
    expect(s.pose).toEqual(DEFAULT_POSES.intro);
  });
  it('is fully in, still closed, before the lid opens', () => {
    const s = state(0.4);
    expect(s.deviceIn).toBe(1);
    expect(s.open).toBe(0);
  });
  it('opens the lid across the lidOpen band and wakes the screen behind it', () => {
    const mid = state(0.55);
    expect(mid.open).toBeGreaterThan(0);
    expect(mid.open).toBeLessThan(1);
    const done = state(0.62);
    expect(done.open).toBe(1);
    expect(done.brightness).toBe(1);
  });
  it('reaches the dive pose by dive end', () => {
    const s = state(0.73);
    expect(s.pose.yaw).toBeCloseTo(DEFAULT_POSES.dive.yaw);
    expect(s.pose.scale).toBeCloseTo(DEFAULT_POSES.dive.scale);
  });
  it('walks screens inside the band', () => {
    expect(state(0.74).screenIndex).toBe(0);
    expect(state(0.91).screenIndex).toBe(4);
  });
  it('recedes to the outro scale at p=1, holding dive rotation', () => {
    const s = state(1);
    expect(s.pose.scale).toBeCloseTo(DEFAULT_POSES.outro.scale);
    expect(s.pose.y).toBeCloseTo(DEFAULT_POSES.outro.y);
    expect(s.pose.yaw).toBeCloseTo(DEFAULT_POSES.dive.yaw);
  });
});

describe('speedCapAt', () => {
  const cap = (p: number) => speedCapAt(p, DEFAULT_TIMELINE, DEFAULT_FEEL, 5);
  it('uses the full cap outside the screens band', () => {
    expect(cap(0.2)).toBeCloseTo(DEFAULT_FEEL.maxSpeed);
  });
  it('drops to the walkthrough pace inside the band', () => {
    // (0.92 - 0.73) / 5 / 0.6 ≈ 0.0633 progress/s
    expect(cap(0.8)).toBeCloseTo((0.92 - 0.73) / 5 / 0.6, 3);
  });
  it('blends smoothly on the way in', () => {
    const before = cap(0.7);
    expect(before).toBeLessThan(DEFAULT_FEEL.maxSpeed);
    expect(before).toBeGreaterThan(cap(0.8));
  });
});
