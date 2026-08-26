import { describe, it, expect } from 'vitest';
import { journeyState } from '../src/journey';
import { DEFAULT_TIMELINE, DEFAULT_POSES } from '../src/constants';

const state = (p: number) => journeyState(p, DEFAULT_TIMELINE, DEFAULT_POSES);

describe('journeyState', () => {
  it('starts hidden, closed, dark, in the intro pose', () => {
    const s = state(0);
    expect(s.deviceIn).toBe(0);
    expect(s.open).toBe(0);
    expect(s.brightness).toBe(0);
    expect(s.pose).toEqual(DEFAULT_POSES.intro);
  });
  it('is fully in, still closed, before the lid opens', () => {
    const s = state(0.3);
    expect(s.deviceIn).toBe(1);
    expect(s.open).toBe(0);
  });
  it('opens the lid across the lidOpen band and wakes the screen behind it', () => {
    const mid = state(0.45);
    expect(mid.open).toBeGreaterThan(0);
    expect(mid.open).toBeLessThan(1);
    const done = state(DEFAULT_TIMELINE.lidOpen[1]);
    expect(done.open).toBe(1);
    expect(done.brightness).toBe(1);
  });
  it('reaches the dive pose by dive end', () => {
    const s = state(DEFAULT_TIMELINE.dive[1]);
    expect(s.pose.yaw).toBeCloseTo(DEFAULT_POSES.dive.yaw);
    expect(s.pose.scale).toBeCloseTo(DEFAULT_POSES.dive.scale);
  });
  it('holds the dive pose, open and bright, between dive end and recede start', () => {
    const s = state(0.75);
    expect(s.open).toBe(1);
    expect(s.brightness).toBe(1);
    expect(s.pose.yaw).toBeCloseTo(DEFAULT_POSES.dive.yaw);
    expect(s.pose.scale).toBeCloseTo(DEFAULT_POSES.dive.scale);
  });
  it('recedes to the outro scale at p=1, holding dive rotation', () => {
    const s = state(1);
    expect(s.pose.scale).toBeCloseTo(DEFAULT_POSES.outro.scale);
    expect(s.pose.y).toBeCloseTo(DEFAULT_POSES.outro.y);
    expect(s.pose.yaw).toBeCloseTo(DEFAULT_POSES.dive.yaw);
  });
});
