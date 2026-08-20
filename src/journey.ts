import { ramp, easeInOut, lerp } from './math';
import { screenAt } from './screenAt';
import type { Timeline, Poses, Pose, Feel } from './types';

/** Everything the scroll journey needs to render one frame, derived purely from progress. */
export interface JourneyState {
  /** 0–1 device fade/rise-in. */
  deviceIn: number;
  /** 0–1 eased lid amount (feed to <Macbook open>). */
  open: number;
  /** 0–1 screen wake (feed to <Macbook brightness>). */
  brightness: number;
  /** Device pose (yaw/pitch radians, scale, x/y world units). */
  pose: Pose;
  /** Active screen index and eased crossfade toward index + 1. */
  screenIndex: number;
  screenMix: number;
}

/**
 * The journey's pure mapping: progress → frame state. Deterministic and
 * side-effect free so DOM overlays and the 3D scene can both call it and agree.
 */
export function journeyState(
  p: number,
  timeline: Timeline,
  poses: Poses,
  screenCount: number,
  crossfadeFraction: number,
): JourneyState {
  const deviceIn = easeInOut(ramp(p, timeline.deviceIn[0], timeline.deviceIn[1]));
  const open = easeInOut(ramp(p, timeline.lidOpen[0], timeline.lidOpen[1]));
  // Screen wakes across the back 80% of the open — dark until the lid cracks.
  const lidSpan = timeline.lidOpen[1] - timeline.lidOpen[0];
  const brightness = easeInOut(ramp(p, timeline.lidOpen[0] + 0.2 * lidSpan, timeline.lidOpen[1]));
  const dive = easeInOut(ramp(p, timeline.dive[0], timeline.dive[1]));
  const recede = easeInOut(ramp(p, timeline.recede[0], timeline.recede[1]));

  const pose: Pose = {
    yaw: lerp(poses.intro.yaw, poses.dive.yaw, dive),
    pitch: lerp(poses.intro.pitch, poses.dive.pitch, dive),
    scale: lerp(lerp(poses.intro.scale, poses.dive.scale, dive), poses.outro.scale, recede),
    x: lerp(poses.intro.x, poses.dive.x, dive),
    y: lerp(lerp(poses.intro.y, poses.dive.y, dive), poses.outro.y, recede),
  };

  const { index, mix } = screenAt(p, screenCount, timeline.screens, crossfadeFraction);
  return { deviceIn, open, brightness, pose, screenIndex: index, screenMix: easeInOut(mix) };
}

/**
 * Per-frame speed cap for the damped follow: the full `feel.maxSpeed` outside
 * the screens band, blending down to a constant walkthrough pace inside it so
 * a hard fling still crosses every screen for at least `screenMinSeconds`.
 */
export function speedCapAt(sp: number, timeline: Timeline, feel: Feel, screenCount: number): number {
  const [s0, s1] = timeline.screens;
  if (screenCount <= 0) return feel.maxSpeed;
  const walkMax = Math.min((s1 - s0) / screenCount / feel.screenMinSeconds, feel.maxSpeed);
  const toExit = ramp(sp, s1, Math.min(1, s1 + 0.025));
  const walk = ramp(sp, s0 - 0.05, s0) * (1 - toExit);
  return lerp(feel.maxSpeed, walkMax, walk);
}
