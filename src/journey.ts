import { ramp, easeInOut, lerp } from './math';
import type { Timeline, Poses, Pose } from './types';

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
}

/**
 * The journey's pure mapping: progress → frame state. Deterministic and
 * side-effect free so DOM overlays and the 3D scene can both call it and agree.
 */
export function journeyState(p: number, timeline: Timeline, poses: Poses): JourneyState {
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

  return { deviceIn, open, brightness, pose };
}
