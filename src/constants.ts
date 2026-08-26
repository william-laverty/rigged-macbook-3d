import type { Timeline, Poses, Pose, Feel } from './types';

/** Package version, injected at build; falls back for dev/test. */
const VERSION: string = typeof __PKG_VERSION__ !== 'undefined' ? __PKG_VERSION__ : '0.0.0-dev';

/**
 * The rigged model, served from the exact published package version. The rig
 * (hinge split, node names, materials) is welded to this file — other models
 * do not work. Self-host by copying it from
 * `node_modules/rigged-macbook-3d/assets/macbook-rigged.glb` and passing `modelSrc`.
 */
export const DEFAULT_MODEL_URL = `https://unpkg.com/rigged-macbook-3d@${VERSION}/assets/macbook-rigged.glb`;

/** Lid hinge angles (radians on LidPivot.rotation.x). Open is the authored pose. */
export const LID = { OPEN_X: 0, CLOSED_X: 1.94 } as const;

/**
 * Seat-lift constants (model space). The model's hinge sits below the keycaps,
 * so a bare rotation would sink the closed screen into the keyboard; the runtime
 * lifts the pivot exactly enough to hold the screen's bottom edge at TARGET_Y.
 * The bake also embeds these in the LidPivot node's extras; these are fallbacks.
 */
export const SEAT = {
  HINGE_Y: -0.5,
  HINGE_Z: -12.2,
  SCREEN_BOTTOM_Y: 1.25,
  SCREEN_BOTTOM_Z: -13.2,
  TARGET_Y: 0.7,
} as const;

/** World size (max dimension) the model is normalised to. */
export const FIT_SIZE = 4.2;

/**
 * Journey beat defaults. The lid gets a quarter of the journey so it swings
 * open unhurried, dive deliberately overlaps its tail and takes its time
 * pulling in, and the two gaps are deliberate rests: 0.64–0.74 is the hold
 * (the open MacBook plays its video front and centre while the user keeps
 * scrolling), and 0.87–1 is the settle. The settle is generous on purpose —
 * the damped follow lags raw scroll, so it needs this much runway for the
 * pushback to finish and rest before the pin releases; trimming it makes the
 * exit collide with the page starting to move.
 */
export const DEFAULT_TIMELINE: Timeline = {
  deviceIn: [0, 0.18],
  lidOpen: [0.24, 0.48],
  dive: [0.42, 0.64],
  recede: [0.74, 0.87],
};

/** Journey pose defaults (tuned on the NOX homepage). */
export const DEFAULT_POSES: Poses = {
  intro: { yaw: -0.5, pitch: 0.32, scale: 0.62, x: 0, y: 0.25 },
  dive: { yaw: 0, pitch: 0.05, scale: 1.0, x: 0, y: 0.05 },
  outro: { scale: 0.68, y: 0.05 },
};

/**
 * Scroll-feel defaults. The follow adapts to input velocity by construction:
 * slow scrolls track closely, quick flicks are absorbed into one continuous
 * glide, and `maxSpeed` keeps a full-page fling at a cinematic pace (a whole
 * journey never plays faster than ~2s) instead of slamming the lid open.
 */
export const DEFAULT_FEEL: Feel = {
  smoothTime: 0.45,
  maxSpeed: 0.5,
};

/** Deep-partial Poses for ergonomic overrides. */
export interface PosesPartial {
  intro?: Partial<Pose>;
  dive?: Partial<Pose>;
  outro?: Partial<{ scale: number; y: number }>;
}

/** Merge a partial timeline over the defaults. */
export function resolveTimeline(t?: Partial<Timeline>): Timeline {
  return { ...DEFAULT_TIMELINE, ...t };
}

/** Merge partial poses over the defaults (per-pose deep merge). */
export function resolvePoses(p?: PosesPartial): Poses {
  return {
    intro: { ...DEFAULT_POSES.intro, ...p?.intro },
    dive: { ...DEFAULT_POSES.dive, ...p?.dive },
    outro: { ...DEFAULT_POSES.outro, ...p?.outro },
  };
}

/** Merge a partial feel over the defaults. */
export function resolveFeel(f?: Partial<Feel>): Feel {
  return { ...DEFAULT_FEEL, ...f };
}
