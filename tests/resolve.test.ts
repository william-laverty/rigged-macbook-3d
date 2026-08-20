import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TIMELINE, DEFAULT_POSES, DEFAULT_FEEL,
  resolveTimeline, resolvePoses, resolveFeel,
} from '../src/constants';

describe('resolvers', () => {
  it('return defaults when called with nothing', () => {
    expect(resolveTimeline()).toEqual(DEFAULT_TIMELINE);
    expect(resolvePoses()).toEqual(DEFAULT_POSES);
    expect(resolveFeel()).toEqual(DEFAULT_FEEL);
  });
  it('merge partial overrides without touching other keys', () => {
    const t = resolveTimeline({ lidOpen: [0.3, 0.5] });
    expect(t.lidOpen).toEqual([0.3, 0.5]);
    expect(t.dive).toEqual(DEFAULT_TIMELINE.dive);

    const p = resolvePoses({ intro: { yaw: -1 } });
    expect(p.intro.yaw).toBe(-1);
    expect(p.intro.pitch).toBe(DEFAULT_POSES.intro.pitch);
    expect(p.dive).toEqual(DEFAULT_POSES.dive);

    const f = resolveFeel({ maxSpeed: 1 });
    expect(f.maxSpeed).toBe(1);
    expect(f.smoothTime).toBe(DEFAULT_FEEL.smoothTime);
  });
});
