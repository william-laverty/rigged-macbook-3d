import type * as THREE from 'three';

/** Described screen content. Strings are sniffed by extension (mp4/webm/mov/m4v → video). */
export interface ScreenSource {
  src: string;
  /** Force the kind when the extension is ambiguous (e.g. extensionless CDN URLs). */
  type?: 'video' | 'image';
  /** Optional fallback (e.g. mp4 for a webm) tried if `src` fails to load/decode. Applies to video sources only. */
  fallbackSrc?: string;
}

/** Anything the screen can show: a URL, a described source, or a ready THREE.Texture. */
export type ScreenInput = string | ScreenSource | THREE.Texture;

/**
 * Named beats of the scroll journey, each a [start, end] pair on 0–1 progress.
 * The gap between `dive` end and `recede` start is the hold — the open MacBook
 * sits front and centre playing its video while the user scrolls through it.
 */
export interface Timeline {
  /** Device fades/rises in. */
  deviceIn: [number, number];
  /** Lid rotates closed → open (screen wakes across the back 80%). */
  lidOpen: [number, number];
  /** Camera-relative dive: intro pose → dived-in pose. */
  dive: [number, number];
  /** Push-back so the whole laptop is visible as scroll hands off to the page. */
  recede: [number, number];
}

/** A device pose the journey lerps between. Angles in radians; x/y in world units. */
export interface Pose {
  yaw: number;
  pitch: number;
  scale: number;
  x: number;
  y: number;
}

/** The three journey poses. */
export interface Poses {
  intro: Pose;
  dive: Pose;
  /** Recede is a pure scale/level change — rotation is held from the dive pose. */
  outro: { scale: number; y: number };
}

/** Scroll-feel tuning for MacbookScroll's damped follow. */
export interface Feel {
  /** Seconds — follow time of the damped scrub; higher = floatier. */
  smoothTime: number;
  /** Progress/second — cap on playback speed so a full-page fling stays fluid. */
  maxSpeed: number;
}

/** Built-in lighting presets. */
export type LightingPreset = 'studio-dark' | 'studio-light' | 'soft';
