export { Macbook, type MacbookProps, type MacbookFrameState } from './Macbook';
export { MacbookLighting, type MacbookLightingProps } from './MacbookLighting';
export { MacbookStage, type MacbookStageProps } from './MacbookStage';
export { MacbookScroll, type MacbookScrollProps, type MacbookScrollHandle } from './MacbookScroll';
export { useScreenTexture } from './useScreenTexture';
export { useCapabilityGate } from './useCapabilityGate';
export { journeyState, type JourneyState } from './journey';
export { ramp, easeInOut, lerp, clamp01, smoothDamp } from './math';
export {
  DEFAULT_MODEL_URL, DEFAULT_TIMELINE, DEFAULT_POSES, DEFAULT_FEEL, LID, SEAT, FIT_SIZE,
  resolveTimeline, resolvePoses, resolveFeel, type PosesPartial,
} from './constants';
export type { ScreenInput, ScreenSource, Timeline, Pose, Poses, Feel, LightingPreset } from './types';
