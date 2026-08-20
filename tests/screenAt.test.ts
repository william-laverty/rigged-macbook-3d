import { describe, it, expect } from 'vitest';
import { screenAt } from '../src/screenAt';

const BAND: [number, number] = [0.7, 0.9];

describe('screenAt', () => {
  it('is index 0, no mix, before and at band start', () => {
    expect(screenAt(0, 5, BAND)).toEqual({ index: 0, next: 0, mix: 0 });
    expect(screenAt(0.7, 5, BAND)).toEqual({ index: 0, next: 0, mix: 0 });
  });
  it('holds the last index at and past band end', () => {
    expect(screenAt(0.9, 5, BAND).index).toBe(4);
    expect(screenAt(1, 5, BAND)).toEqual({ index: 4, next: 4, mix: 0 });
  });
  it('walks the indices across the band', () => {
    // 5 screens over [0.7, 0.9] → each band is 0.04 wide; 0.75 is early in screen 1.
    expect(screenAt(0.75, 5, BAND).index).toBe(1);
  });
  it('crossfades only in the tail crossfadeFraction of a band', () => {
    // Band 0 spans [0.7, 0.74]; with fraction 0.4 the fade starts at 0.7 + 0.04*0.6 = 0.724.
    expect(screenAt(0.72, 5, BAND, 0.4).mix).toBe(0);
    const fading = screenAt(0.732, 5, BAND, 0.4);
    expect(fading.index).toBe(0);
    expect(fading.next).toBe(1);
    expect(fading.mix).toBeGreaterThan(0);
    expect(fading.mix).toBeLessThan(1);
  });
  it('never crossfades past the last screen', () => {
    const end = screenAt(0.899, 5, BAND, 0.4);
    expect(end.index).toBe(4);
    expect(end.mix).toBe(0);
  });
  it('is safe for count 0 and 1', () => {
    expect(screenAt(0.8, 0, BAND)).toEqual({ index: 0, next: 0, mix: 0 });
    expect(screenAt(0.8, 1, BAND)).toEqual({ index: 0, next: 0, mix: 0 });
  });
});
