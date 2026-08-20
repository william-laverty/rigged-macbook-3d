# rigged-macbook-3d Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, document, and publish `rigged-macbook-3d` v0.1.0 — a React/three.js library exposing a genuinely rigged 3D MacBook (openable lid, video/image screen with crossfade, lighting presets, optional zero-dependency scroll journey driver) — plus a Vite demo deployed to Vercel.

**Architecture:** Headless controlled core (`<Macbook>`) that renders whatever state its props (or a per-frame `frameDriver`) describe, layered under convenience wrappers (`<MacbookLighting>`, `<MacbookStage>`) and an optional scroll driver (`<MacbookScroll>`) built on `position: sticky` + a critically-damped rAF follow (no GSAP/Lenis). The GLB is pre-rigged offline by a gltf-transform script adapted from nox-website PR #303 (lid split under a named hinge pivot, Space-Black materials, meshopt compression).

**Tech Stack:** TypeScript, React, three.js, @react-three/fiber, @react-three/drei, tsup, vitest, @gltf-transform/*, meshoptimizer, draco3d (bake-time only), Vite (demo), Vercel (demo hosting), npm (publish).

**Spec:** `docs/specs/2026-08-20-rigged-macbook-3d-design.md` (in this repo — read it first; this plan implements it).

## Global Constraints

- Working directory for every task: `/Users/williamlaverty/Projects/labs/rigged-macbook-3d` (git repo already initialized, spec committed).
- Package name `rigged-macbook-3d`, version `0.1.0`, MIT license, author William Laverty.
- Runtime peer deps ONLY: `react`, `react-dom`, `three`, `@react-three/fiber`, `@react-three/drei`. No GSAP, no Lenis, no runtime deps at all. (Deviation from spec §2 noted: drei is a PEER, not a regular dep — a regular drei dep would pin a fiber major and break React 18 consumers, violating spec success criterion 3.)
- Node names inside the baked GLB: `Base`, `LidPivot`, `LidHolder`, `Lid`, `Screen`. Material tag: `extras.spaceBlack`. (Neutral names — no `nox` prefixes anywhere in shipped code.)
- Rig constants (exact values, from the NOX implementation): `LID.OPEN_X = 0`, `LID.CLOSED_X = 1.94` (radians), `HINGE_Y = -0.5`, `HINGE_Z = -12.2`, `SCREEN_BOTTOM = {Y: 1.25, Z: -13.2}`, `SEAT_TARGET_Y = 0.7`, fit size `4.2`, screen material name in source GLB `sfCQkHOWyrsLmor`, Space Black `[0.05, 0.05, 0.06]`.
- The NOX source website lives at `/Users/williamlaverty/Projects/NOX/nox-website` (read-only reference; PR branch `origin/perf/prebake-macbook-rig` holds the bake script to adapt).
- Attribution: model "MacBook Pro M3 16-inch 2024" by jackbaeten, CC-BY 4.0, https://sketchfab.com/3d-models/macbook-pro-m3-16-inch-2024-8e34fc2b303144f78490007d91ff57c4 — must appear in CREDITS.md, README, and the baked GLB's asset extras.
- Commit after every task (specific paths only — never `git add .`), message style `feat:`/`docs:`/`chore:`/`test:`.
- All shipped source is TypeScript with JSDoc on every exported symbol.

## File Structure (final)

```
rigged-macbook-3d/
├── package.json  tsconfig.json  tsup.config.ts  vitest.config.ts  vercel.json  .gitignore
├── LICENSE  CREDITS.md  README.md  llms.txt  CHANGELOG.md
├── assets/macbook-source.glb        # Draco source (repo only)
├── assets/macbook-rigged.glb        # baked meshopt output (published)
├── scripts/rig-model.mjs            # gltf-transform bake
├── src/
│   ├── index.ts                     # public exports
│   ├── env.d.ts                     # __PKG_VERSION__ declaration
│   ├── math.ts                      # ramp/easeInOut/lerp/clamp01/smoothDamp
│   ├── screenAt.ts                  # walkthrough mapping (generalised demoAt)
│   ├── constants.ts                 # model URL, rig constants, defaults
│   ├── types.ts                     # shared public types
│   ├── journey.ts                   # pure scroll-journey state (journeyState, speedCapAt)
│   ├── useScreenTextures.ts         # video/image/Texture → THREE.Texture hook
│   ├── useCapabilityGate.ts         # WebGL2 + reduced-motion gate
│   ├── Macbook.tsx                  # headless rigged model
│   ├── MacbookLighting.tsx          # presets
│   ├── MacbookStage.tsx             # Canvas wrapper
│   └── MacbookScroll.tsx            # scroll journey driver
├── tests/ math.test.ts  screenAt.test.ts  journey.test.ts  resolve.test.ts
└── demo/                            # Vite app (never published to npm)
    ├── package.json  index.html  vite.config.ts  tsconfig.json
    ├── public/macbook-rigged.glb  public/videos/*.{webm,mp4}
    └── src/ main.tsx  App.tsx  Journey.tsx  Playground.tsx  TabBar.tsx  styles.css
```

---

### Task 1: Package scaffold, tooling, licensing, auth preflight

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `.gitignore`, `LICENSE`, `CREDITS.md`, `src/env.d.ts`

**Interfaces:**
- Produces: build/test commands every later task uses: `npm test`, `npm run build`, `npm run typecheck`. The `__PKG_VERSION__` compile-time constant.

- [ ] **Step 1: Preflight — verify publish credentials exist NOW (not at the end)**

Run: `npm whoami && gh auth status`
Expected: an npm username and a logged-in GitHub account. If either fails, STOP and report — the final tasks cannot complete without them.

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "rigged-macbook-3d",
  "version": "0.1.0",
  "description": "A genuinely rigged 3D MacBook for React — openable lid on a real hinge, video/image screen with crossfade, studio lighting presets, and an optional zero-dependency scroll journey. Built on three.js / @react-three/fiber.",
  "keywords": ["macbook", "3d", "three", "react-three-fiber", "r3f", "scroll", "laptop", "webgl", "glb", "rigged"],
  "author": "William Laverty",
  "license": "MIT",
  "repository": { "type": "git", "url": "git+https://github.com/williamlaverty/rigged-macbook-3d.git" },
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist", "assets/macbook-rigged.glb", "README.md", "CREDITS.md", "LICENSE"],
  "sideEffects": false,
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "bake": "node scripts/rig-model.mjs",
    "build:demo": "npm run build && npm --prefix demo install && npm --prefix demo run build"
  },
  "peerDependencies": {
    "@react-three/drei": ">=9.122.0",
    "@react-three/fiber": ">=8.18.0",
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0",
    "three": ">=0.160.0"
  },
  "devDependencies": {}
}
```

- [ ] **Step 3: Install dev dependencies**

Run:
```bash
npm i -D typescript tsup vitest @types/react react react-dom three @types/three @react-three/fiber @react-three/drei @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions meshoptimizer draco3d
```

- [ ] **Step 4: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM"],
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 5: Write `tsup.config.ts`**

```ts
import { defineConfig } from 'tsup';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  // Next.js App Router: mark the whole library as a client component.
  banner: { js: '"use client";' },
  define: { __PKG_VERSION__: JSON.stringify(pkg.version) },
  external: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei'],
});
```

- [ ] **Step 6: Write `src/env.d.ts` and `vitest.config.ts`**

`src/env.d.ts`:
```ts
/** Injected by tsup at build time (see tsup.config.ts). Undefined in vitest/dev. */
declare const __PKG_VERSION__: string | undefined;
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
```

- [ ] **Step 7: Write `.gitignore`, `LICENSE`, `CREDITS.md`**

`.gitignore`:
```
node_modules/
dist/
demo/dist/
demo/node_modules/
.vercel/
*.log
.DS_Store
```

`LICENSE`: standard MIT text, `Copyright (c) 2026 William Laverty`. (Applies to the code; the 3D model is CC-BY 4.0 — see CREDITS.md.)

`CREDITS.md`:
```markdown
# Credits

## 3D model — assets/macbook-source.glb / assets/macbook-rigged.glb

- **Model:** "MacBook Pro M3 16-inch 2024" by **jackbaeten**
  (https://sketchfab.com/3d-models/macbook-pro-m3-16-inch-2024-8e34fc2b303144f78490007d91ff57c4)
- **License:** CC-BY 4.0 (https://creativecommons.org/licenses/by/4.0/) — attribution required.
- **Modifications (William Laverty):** materials recoloured to Space Black; lid/base
  geometry split at the hinge seam by connected component; lid reparented under a hinge
  pivot node (`LidPivot`) so it can be animated; screen panel isolated as node `Screen`;
  meshopt compression. See `scripts/rig-model.mjs`.

## Trademark note

This project is not affiliated with or endorsed by Apple Inc. "MacBook" is a trademark of
Apple Inc., depicted here nominatively to describe what the model portrays.
```

- [ ] **Step 8: Verify tooling runs, then commit**

Run: `npm run typecheck && npm test`
Expected: typecheck passes (no files yet beyond env.d.ts); vitest reports "no test files found" — that exits non-zero, so for THIS task only run `npx vitest run --passWithNoTests` instead of `npm test`.

```bash
git add package.json package-lock.json tsconfig.json tsup.config.ts vitest.config.ts .gitignore LICENSE CREDITS.md src/env.d.ts
git commit -m "chore: scaffold package, tooling, and licensing"
```

---

### Task 2: `src/math.ts` (TDD)

**Files:**
- Create: `src/math.ts`
- Test: `tests/math.test.ts`

**Interfaces:**
- Produces: `ramp(p, a, b): number`, `easeInOut(t): number`, `lerp(a, b, t): number`, `clamp01(v): number`, `smoothDamp(current, target, velRef: {current: number}, smoothTime, dt, maxSpeed): number` — used by every later task.

- [ ] **Step 1: Write the failing tests — `tests/math.test.ts`**

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `../src/math`.

- [ ] **Step 3: Write `src/math.ts`** — a verbatim port of the NOX implementation (reference: `/Users/williamlaverty/Projects/NOX/nox-website/src/components/MacbookSection/math.ts`), with JSDoc:

```ts
/** 0→1 ramp across [a, b], clamped. */
export function ramp(p: number, a: number, b: number): number {
  if (p <= a) return 0;
  if (p >= b) return 1;
  return (p - a) / (b - a);
}

/** Cubic ease-in-out. */
export function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Linear interpolation from a to b by t. */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Clamp to [0, 1]. */
export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Critically-damped follow (Unity's SmoothDamp): eases `current` toward `target`
 * with no overshoot — ease-in AND ease-out — carrying velocity in `velRef`
 * between calls and capping the follow speed at `maxSpeed` (units/second).
 */
export function smoothDamp(
  current: number,
  target: number,
  velRef: { current: number },
  smoothTime: number,
  dt: number,
  maxSpeed: number,
): number {
  const st = Math.max(0.0001, smoothTime);
  const omega = 2 / st;
  const x = omega * dt;
  const expo = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const maxChange = maxSpeed * st;
  const change = Math.min(maxChange, Math.max(-maxChange, current - target));
  const temp = (velRef.current + omega * change) * dt;
  velRef.current = (velRef.current - omega * temp) * expo;
  let output = current - change + (change + temp) * expo;
  if ((target - current > 0) === (output > target)) {
    output = target;
    velRef.current = (output - target) / dt;
  }
  return output;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test` — Expected: all math tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/math.ts tests/math.test.ts
git commit -m "feat: scroll/animation math (ramp, easeInOut, lerp, smoothDamp)"
```

---

### Task 3: Types, defaults, resolvers, `screenAt` (TDD)

**Files:**
- Create: `src/types.ts`, `src/constants.ts`, `src/screenAt.ts`
- Test: `tests/screenAt.test.ts`, `tests/resolve.test.ts`

**Interfaces:**
- Consumes: `src/math.ts`.
- Produces (exact names later tasks use):
  - `types.ts`: `ScreenSource { src: string; type?: 'video' | 'image'; fallbackSrc?: string; label?: string }`, `ScreenInput = string | ScreenSource | THREE.Texture`, `Timeline { deviceIn: [number, number]; lidOpen: [number, number]; dive: [number, number]; screens: [number, number]; recede: [number, number] }`, `Pose { yaw: number; pitch: number; scale: number; x: number; y: number }`, `Poses { intro: Pose; dive: Pose; outro: { scale: number; y: number } }`, `Feel { smoothTime: number; maxSpeed: number; screenMinSeconds: number; crossfadeFraction: number }`, `LightingPreset = 'studio-dark' | 'studio-light' | 'soft'`.
  - `constants.ts`: `DEFAULT_MODEL_URL: string`, `LID = { OPEN_X: 0, CLOSED_X: 1.94 }`, `SEAT = { HINGE_Y: -0.5, HINGE_Z: -12.2, SCREEN_BOTTOM_Y: 1.25, SCREEN_BOTTOM_Z: -13.2, TARGET_Y: 0.7 }`, `FIT_SIZE = 4.2`, `DEFAULT_TIMELINE: Timeline`, `DEFAULT_POSES: Poses`, `DEFAULT_FEEL: Feel`, `resolveTimeline(t?: Partial<Timeline>): Timeline`, `resolvePoses(p?: DeepPartialPoses): Poses` (accepts partial pose objects), `resolveFeel(f?: Partial<Feel>): Feel`.
  - `screenAt.ts`: `screenAt(p: number, count: number, band: [number, number], crossfadeFraction?: number): { index: number; next: number; mix: number }`.

- [ ] **Step 1: Write the failing tests**

`tests/screenAt.test.ts`:
```ts
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
```

`tests/resolve.test.ts`:
```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test` — Expected: FAIL, modules not found.

- [ ] **Step 3: Write `src/types.ts`**

```ts
import type * as THREE from 'three';

/** One entry of screen content. Strings are sniffed by extension (mp4/webm/mov/m4v → video). */
export interface ScreenSource {
  src: string;
  /** Force the kind when the extension is ambiguous (e.g. extensionless CDN URLs). */
  type?: 'video' | 'image';
  /** Optional fallback (e.g. mp4 for a webm) tried if `src` fails to load/decode. */
  fallbackSrc?: string;
  /** Optional display label — surfaced by MacbookScroll's onActiveScreen consumers. */
  label?: string;
}

/** Anything the screen can show: a URL, a described source, or a ready THREE.Texture. */
export type ScreenInput = string | ScreenSource | THREE.Texture;

/** Named beats of the scroll journey, each a [start, end] pair on 0–1 progress. */
export interface Timeline {
  /** Device fades/rises in. */
  deviceIn: [number, number];
  /** Lid rotates closed → open (screen wakes across the back half). */
  lidOpen: [number, number];
  /** Camera-relative dive: intro pose → dived-in pose. */
  dive: [number, number];
  /** Screen walkthrough band (crossfades happen inside it). */
  screens: [number, number];
  /** Push-back so the whole laptop is visible at hand-off. */
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
  /** Progress/second — cap on playback speed outside the screens band. */
  maxSpeed: number;
  /** Minimum seconds each screen's band takes to cross at full fling. */
  screenMinSeconds: number;
  /** Fraction of each screen band spent crossfading into the next (0–1). */
  crossfadeFraction: number;
}

/** Built-in lighting presets. */
export type LightingPreset = 'studio-dark' | 'studio-light' | 'soft';
```

- [ ] **Step 4: Write `src/constants.ts`**

```ts
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

/** Journey beat defaults (tuned on the NOX homepage). */
export const DEFAULT_TIMELINE: Timeline = {
  deviceIn: [0, 0.25],
  lidOpen: [0.45, 0.62],
  dive: [0.58, 0.73],
  screens: [0.73, 0.92],
  recede: [0.92, 1],
};

/** Journey pose defaults (tuned on the NOX homepage). */
export const DEFAULT_POSES: Poses = {
  intro: { yaw: -0.5, pitch: 0.32, scale: 0.62, x: 0, y: 0.25 },
  dive: { yaw: 0, pitch: 0.05, scale: 1.0, x: 0, y: 0.05 },
  outro: { scale: 0.68, y: 0.05 },
};

/** Scroll-feel defaults (tuned on the NOX homepage). */
export const DEFAULT_FEEL: Feel = {
  smoothTime: 0.33,
  maxSpeed: 0.42,
  screenMinSeconds: 0.6,
  crossfadeFraction: 0.4,
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
```

- [ ] **Step 5: Write `src/screenAt.ts`** — generalised port of NOX `demoAt`:

```ts
/**
 * Where the screen walkthrough is at progress `p`: the current screen, the one
 * blending in (always index + 1, clamped), and the raw 0–1 blend amount.
 * Consumers apply their own easing to `mix`. Use the same call for the 3D
 * crossfade and any DOM overlay (tab bars, captions) so they stay in lockstep.
 */
export function screenAt(
  p: number,
  count: number,
  band: [number, number],
  crossfadeFraction = 0.4,
): { index: number; next: number; mix: number } {
  if (count <= 1) return { index: 0, next: 0, mix: 0 };
  const [a, b] = band;
  const f = p <= a ? 0 : Math.min(((p - a) / (b - a)) * count, count - 1e-4);
  const index = Math.min(Math.floor(f), count - 1);
  const frac = f - index;
  let mix = 0;
  let next = index;
  if (frac > 1 - crossfadeFraction && index < count - 1) {
    mix = (frac - (1 - crossfadeFraction)) / crossfadeFraction;
    next = index + 1;
  }
  return { index, next, mix };
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test && npm run typecheck` — Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/constants.ts src/screenAt.ts tests/screenAt.test.ts tests/resolve.test.ts
git commit -m "feat: public types, journey defaults, and screen walkthrough mapping"
```

---

### Task 4: Pure journey state — `src/journey.ts` (TDD)

**Files:**
- Create: `src/journey.ts`
- Test: `tests/journey.test.ts`

**Interfaces:**
- Consumes: `math.ts` (`ramp`, `easeInOut`, `lerp`), `screenAt.ts`, types.
- Produces:
  - `interface JourneyState { deviceIn: number; open: number; brightness: number; pose: Pose; screenIndex: number; screenMix: number }`
  - `journeyState(p: number, timeline: Timeline, poses: Poses, screenCount: number, crossfadeFraction: number): JourneyState`
  - `speedCapAt(sp: number, timeline: Timeline, feel: Feel, screenCount: number): number`

- [ ] **Step 1: Write the failing tests — `tests/journey.test.ts`**

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test` — Expected: FAIL, `../src/journey` not found.

- [ ] **Step 3: Write `src/journey.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/journey.ts tests/journey.test.ts
git commit -m "feat: pure journey state and per-phase speed caps"
```

---

### Task 5: Model assets + bake script

**Files:**
- Create: `assets/macbook-source.glb` (copied), `scripts/rig-model.mjs`, `assets/macbook-rigged.glb` (generated)

**Interfaces:**
- Produces: `assets/macbook-rigged.glb` with nodes `Base`, `LidPivot` (translation `[0, -0.5, -12.2]`), `LidHolder`, `Lid`, `Screen` (single-primitive mesh); recoloured materials tagged `extras.spaceBlack: true`; `LidPivot` extras `{ lidOpenX: 0, lidClosedX: 1.94, screenBottomY: 1.25, screenBottomZ: -13.2, seatTargetY: 0.7 }`; asset extras carrying the CC-BY attribution.

- [ ] **Step 1: Copy the Draco source GLB**

```bash
mkdir -p assets scripts
cp /Users/williamlaverty/Projects/NOX/nox-website/public/models/macbook.glb assets/macbook-source.glb
ls -la assets/  # expect ~639 KB macbook-source.glb
```

(If nox-website main has already merged PR #303 and `public/models/macbook.glb` is now the BAKED file, take the source from the PR branch instead: `cd /Users/williamlaverty/Projects/NOX/nox-website && git show origin/perf/prebake-macbook-rig:assets/models/macbook-source.glb > /Users/williamlaverty/Projects/labs/rigged-macbook-3d/assets/macbook-source.glb`. Distinguish them: the Draco source is ~624 KB and contains the string `KHR_draco_mesh_compression`; check with `strings assets/macbook-source.glb | grep -c draco`.)

- [ ] **Step 2: Extract the proven bake script as the base**

```bash
cd /Users/williamlaverty/Projects/NOX/nox-website && git fetch -q origin perf/prebake-macbook-rig && git show origin/perf/prebake-macbook-rig:scripts/bake-macbook-rig.mjs > /Users/williamlaverty/Projects/labs/rigged-macbook-3d/scripts/rig-model.mjs
```

- [ ] **Step 3: Adapt `scripts/rig-model.mjs`** — apply exactly these edits to the copied script:

1. **Paths:** `const SRC = path.join(ROOT, 'assets/macbook-source.glb');` and `const OUT = path.join(ROOT, 'assets/macbook-rigged.glb');`
2. **Node names:** `noxBase` → `Base`, `noxLidPivot` → `LidPivot`, `noxLidHolder` → `LidHolder`, `noxLid` → `Lid`, `noxScreen` → `Screen`, `noxBaseMesh` → `BaseMesh`, `noxLidMesh` → `LidMesh`, `noxScreenMesh` → `ScreenMesh`.
3. **Material tag:** `extras.noxSpaceBlack` → `extras.spaceBlack` (i.e. `mat.setExtras({ ...mat.getExtras(), spaceBlack: true })`).
4. **Embed rig constants on the pivot** — immediately after the `pivot` node is created, add:
```js
pivot.setExtras({
  lidOpenX: 0,
  lidClosedX: 1.94,
  screenBottomY: 1.25,
  screenBottomZ: -13.2,
  seatTargetY: 0.7,
});
```
5. **Embed attribution** — after `const root = doc.getRoot();` add:
```js
root.getAsset().extras = {
  ...root.getAsset().extras,
  title: 'MacBook Pro M3 16-inch 2024 (rigged)',
  author: 'jackbaeten (https://sketchfab.com/3d-models/macbook-pro-m3-16-inch-2024-8e34fc2b303144f78490007d91ff57c4)',
  license: 'CC-BY-4.0 (https://creativecommons.org/licenses/by/4.0/)',
  modifications: 'Space-Black recolour, hinge lid/base split, LidPivot rig, meshopt compression — rigged-macbook-3d (https://github.com/williamlaverty/rigged-macbook-3d)',
};
```
6. **Header comment:** rewrite the top doc comment to describe THIS package (source `assets/macbook-source.glb`, output `assets/macbook-rigged.glb`, run via `npm run bake`), keeping the 4-step pipeline description and the CC-BY note. Remove NOX-specific references.
7. Keep everything else verbatim: the union-find `splitByHinge`, hinge constants (`HINGE_Y -0.5`, `HINGE_Z -12.2`, `SPLIT_NY 0`, `SPLIT_NZ -1`, `SPLIT_OFFSET 0`), `SCREEN_MATERIAL_NAME 'sfCQkHOWyrsLmor'`, recolour rule (lightness > 0.22, metallic 1.0, roughness 0.5), instanced-mesh cloning, `transformMesh`, hard-fail checks, `dedup/prune/compactPrimitive/weld/meshopt` transform chain, `BAKE_COMPRESS=draco` escape hatch, and the summary logging.

- [ ] **Step 4: Run the bake**

Run: `npm run bake`
Expected output: `recoloured N materials to Space Black` (N ≥ 1), lid/base primitive counts, and a final size line (~900–950 KB meshopt output). Hard-fails (thrown errors) mean the source GLB or constants are wrong — stop and investigate, do not soften the checks.

- [ ] **Step 5: Sanity-check the output structure**

Run:
```bash
node -e "
import('@gltf-transform/core').then(async ({ NodeIO }) => {
  const { ALL_EXTENSIONS } = await import('@gltf-transform/extensions');
  const { MeshoptDecoder } = await import('meshoptimizer');
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const doc = await io.read('assets/macbook-rigged.glb');
  const names = [];
  doc.getRoot().getDefaultScene().traverse((n) => names.push(n.getName()));
  console.log('nodes:', names.join(', '));
  const pivot = doc.getRoot().listNodes().find((n) => n.getName() === 'LidPivot');
  console.log('pivot extras:', JSON.stringify(pivot.getExtras()));
  console.log('asset extras:', JSON.stringify(doc.getRoot().getAsset().extras));
});
"
```
Expected: nodes include `Base`, `LidPivot`, `LidHolder`, `Lid`, `Screen`; pivot extras carry the five rig constants; asset extras carry the attribution.

- [ ] **Step 6: Commit**

```bash
git add assets/macbook-source.glb assets/macbook-rigged.glb scripts/rig-model.mjs
git commit -m "feat: bake the rigged MacBook GLB (hinge split, Space Black, meshopt)"
```

---

### Task 6: `useScreenTextures` + `useCapabilityGate`

**Files:**
- Create: `src/useScreenTextures.ts`, `src/useCapabilityGate.ts`

**Interfaces:**
- Consumes: `types.ts` (`ScreenInput`, `ScreenSource`).
- Produces:
  - `useScreenTextures(sources: ScreenInput[]): { texturesRef: React.MutableRefObject<(THREE.Texture | null)[]>; ready: boolean; setPlaying: (indices: Set<number>) => void; pauseAll: () => void }` — `setPlaying`/`pauseAll` are identity-stable (safe to call from `useFrame`).
  - `useCapabilityGate(): boolean | null` — `null` while pending (first client render/SSR), then capable yes/no; only ever downgrades live.

These are DOM/WebGL hooks — no vitest coverage (jsdom has no WebGL); they are exercised by the demo and the Task 12 visual verification.

- [ ] **Step 1: Write `src/useScreenTextures.ts`** (port of NOX `useScreenVideos`, generalised to mixed sources):

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { ScreenInput, ScreenSource } from './types';

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;

interface Normalised {
  kind: 'video' | 'image' | 'texture';
  src?: string;
  fallbackSrc?: string;
  texture?: THREE.Texture;
}

function normalise(input: ScreenInput): Normalised {
  if (input instanceof THREE.Texture) return { kind: 'texture', texture: input };
  const s: ScreenSource = typeof input === 'string' ? { src: input } : input;
  const kind = s.type ?? (VIDEO_EXT.test(s.src) ? 'video' : 'image');
  return { kind, src: s.src, fallbackSrc: s.fallbackSrc };
}

/**
 * Turns screen inputs (video URLs, image URLs, or ready textures) into an
 * index-aligned list of THREE.Textures. Videos are muted, looping, detached
 * <video> elements driven imperatively — call `setPlaying` with the indices
 * that should decode (typically just the visible one or two); the rest pause.
 */
export function useScreenTextures(sources: ScreenInput[]) {
  const texturesRef = useRef<(THREE.Texture | null)[]>([]);
  const videosRef = useRef<(HTMLVideoElement | null)[]>([]);
  const [ready, setReady] = useState(false);

  // Key the effect on the source identities, not the array reference, so
  // consumers can pass inline arrays without re-creating every texture.
  const key = sources
    .map((s) => (s instanceof THREE.Texture ? `tex:${s.uuid}` : typeof s === 'string' ? s : `${s.src}|${s.fallbackSrc ?? ''}`))
    .join('¦');

  useEffect(() => {
    const norm = sources.map(normalise);
    const owned: THREE.Texture[] = []; // textures WE created (disposed on cleanup)
    const videos: (HTMLVideoElement | null)[] = norm.map(() => null);

    const textures = norm.map((n, i) => {
      if (n.kind === 'texture') return n.texture!;
      if (n.kind === 'image') {
        const t = new THREE.TextureLoader().load(n.src!);
        t.colorSpace = THREE.SRGBColorSpace;
        owned.push(t);
        return t;
      }
      const v = document.createElement('video');
      v.src = n.src!;
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      // Only the first entry buffers ahead (it must never be a black panel);
      // the rest fetch on their first play().
      v.preload = i === 0 ? 'auto' : 'metadata';
      v.crossOrigin = 'anonymous';
      if (n.fallbackSrc) {
        v.addEventListener('error', () => {
          if (!v.src.endsWith(n.fallbackSrc!)) {
            v.src = n.fallbackSrc!;
            v.load();
          }
        });
      }
      v.load();
      videos[i] = v;
      const t = new THREE.VideoTexture(v);
      t.colorSpace = THREE.SRGBColorSpace;
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
      owned.push(t);
      return t;
    });

    texturesRef.current = textures;
    videosRef.current = videos;
    setReady(true);

    return () => {
      owned.forEach((t) => t.dispose());
      videos.forEach((v) => {
        if (!v) return;
        v.pause();
        v.removeAttribute('src');
        v.load();
      });
      texturesRef.current = [];
      videosRef.current = [];
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  /** Play exactly the given indices' videos; pause the rest. Frame-loop safe. */
  const setPlaying = useCallback((indices: Set<number>) => {
    videosRef.current.forEach((v, i) => {
      if (!v) return;
      if (indices.has(i)) {
        if (v.paused) v.play().catch(() => {});
      } else if (!v.paused) {
        v.pause();
      }
    });
  }, []);

  /** Pause every video (e.g. section off-screen). */
  const pauseAll = useCallback(() => {
    videosRef.current.forEach((v) => {
      if (v && !v.paused) v.pause();
    });
  }, []);

  return { texturesRef, ready, setPlaying, pauseAll };
}
```

- [ ] **Step 2: Write `src/useCapabilityGate.ts`**:

```ts
import { useEffect, useState } from 'react';

// three r163+ requires WebGL2 — probe it specifically.
function detectWebGL2(): boolean {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

/**
 * Whether this client should get the 3D experience: WebGL2 available and
 * `prefers-reduced-motion` not set. Returns `null` on the first render
 * (SSR-safe), then a boolean. Re-evaluates live but only ever DOWNGRADES —
 * remounting a 3D scene under the user is its own kind of motion.
 */
export function useCapabilityGate(): boolean | null {
  const [capable, setCapable] = useState<boolean | null>(null);

  useEffect(() => {
    const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const ok = detectWebGL2() && !reduceMq.matches;
    setCapable(ok);
    const onChange = () => {
      if (reduceMq.matches) setCapable(false);
    };
    reduceMq.addEventListener('change', onChange);
    return () => reduceMq.removeEventListener('change', onChange);
  }, []);

  return capable;
}
```

- [ ] **Step 3: Typecheck and commit**

Run: `npm run typecheck` — Expected: PASS.

```bash
git add src/useScreenTextures.ts src/useCapabilityGate.ts
git commit -m "feat: screen texture hook and capability gate"
```

---

### Task 7: `<Macbook>` — the headless rigged model

**Files:**
- Create: `src/Macbook.tsx`

**Interfaces:**
- Consumes: `useScreenTextures`, `constants.ts` (`DEFAULT_MODEL_URL`, `LID`, `SEAT`, `FIT_SIZE`), `math.ts` (`clamp01`), drei `useGLTF`.
- Produces:
```ts
export interface MacbookFrameState {
  open?: number; brightness?: number; screenIndex?: number; screenMix?: number;
}
export interface MacbookProps extends GroupProps /* from @react-three/fiber */ {
  open?: number;                 // default 1
  screen?: ScreenInput;
  screens?: ScreenInput[];
  screenIndex?: number;          // default 0
  screenMix?: number;            // default 0
  brightness?: number;           // default 1
  autoPlayScreens?: boolean;     // default true
  modelSrc?: string;             // same file only, self-host escape hatch
  frameDriver?: () => MacbookFrameState;  // per-frame override of the above
  onLoad?: () => void;
}
export const Macbook: React.ForwardRefExoticComponent<MacbookProps & React.RefAttributes<THREE.Group>>;
```
- `frameDriver` is the per-frame escape hatch: called inside `useFrame`, its returned fields override the matching props that frame (used by `MacbookScroll`, Framer Motion bindings, custom scroll libs).

- [ ] **Step 1: Write `src/Macbook.tsx`**

```tsx
import { forwardRef, useEffect, useMemo, useRef } from 'react';
import { useFrame, type GroupProps } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { DEFAULT_MODEL_URL, LID, SEAT, FIT_SIZE } from './constants';
import { clamp01 } from './math';
import { useScreenTextures } from './useScreenTextures';
import type { ScreenInput } from './types';

/** Per-frame state a `frameDriver` may return; fields override the matching props. */
export interface MacbookFrameState {
  open?: number;
  brightness?: number;
  screenIndex?: number;
  screenMix?: number;
}

export interface MacbookProps extends GroupProps {
  /** Lid amount: 0 = closed, 1 = fully open. Linear — apply your own easing. Default 1. */
  open?: number;
  /** Single screen content (sugar for `screens={[screen]}`). */
  screen?: ScreenInput;
  /** Screen playlist; crossfade between entries with screenIndex/screenMix. */
  screens?: ScreenInput[];
  /** Active playlist entry. Default 0. */
  screenIndex?: number;
  /** 0–1 crossfade from screenIndex toward screenIndex + 1. Raw — apply your own easing. Default 0. */
  screenMix?: number;
  /** Screen wake: 0 = black, 1 = full. Default 1. */
  brightness?: number;
  /** Auto play/pause videos so only visible entries decode (paused while the lid is shut). Default true. */
  autoPlayScreens?: boolean;
  /**
   * Self-hosting escape hatch. Must be THIS package's `assets/macbook-rigged.glb`
   * (copy it from node_modules) — the rig is welded to that file; other models throw.
   */
  modelSrc?: string;
  /** Called once the model is rigged and ready. */
  onLoad?: () => void;
  /**
   * Advanced: per-frame state source, called inside the render loop. Returned
   * fields override the matching props each frame — drive `open` etc. from
   * scroll positions or MotionValues without re-rendering React.
   */
  frameDriver?: () => MacbookFrameState;
}

interface Rig {
  pivot: THREE.Object3D;
  baseMat: THREE.MeshBasicMaterial;
  overMat: THREE.MeshBasicMaterial;
  offset: [number, number, number];
  scale: number;
  seat: { hingeY: number; hingeZ: number; relY: number; relZ: number; targetY: number; openX: number; closedX: number };
}

/**
 * The rigged 3D MacBook. Headless and controlled: renders exactly the state
 * its props (or `frameDriver`) describe, inside any @react-three/fiber canvas.
 * Model: "MacBook Pro M3 16-inch 2024" by jackbaeten (CC-BY 4.0), pre-rigged —
 * see CREDITS.md.
 */
export const Macbook = forwardRef<THREE.Group, MacbookProps>(function Macbook(
  {
    open = 1,
    screen,
    screens,
    screenIndex = 0,
    screenMix = 0,
    brightness = 1,
    autoPlayScreens = true,
    modelSrc,
    onLoad,
    frameDriver,
    ...groupProps
  },
  ref,
) {
  const url = modelSrc ?? DEFAULT_MODEL_URL;
  const { scene } = useGLTF(url);
  const sources = useMemo<ScreenInput[]>(
    () => screens ?? (screen !== undefined ? [screen] : []),
    [screens, screen],
  );
  const { texturesRef, ready, setPlaying, pauseAll } = useScreenTextures(sources);

  const rig = useMemo<Rig>(() => {
    const cached = scene.userData.__riggedMacbook as Rig | undefined;
    if (cached) return cached;

    const pivot = scene.getObjectByName('LidPivot');
    if (!pivot) {
      throw new Error(
        'rigged-macbook-3d: node "LidPivot" not found in the model. Only this package\'s ' +
          'assets/macbook-rigged.glb works (the rig is welded to it). If you passed modelSrc, ' +
          'copy the file from node_modules/rigged-macbook-3d/assets/macbook-rigged.glb.',
      );
    }
    const screenMesh = scene.getObjectByName('Screen') as THREE.Mesh | undefined;
    if (!screenMesh?.isMesh) {
      throw new Error(
        'rigged-macbook-3d: mesh "Screen" not found in the model — screen content cannot display. ' +
          'Use this package\'s assets/macbook-rigged.glb.',
      );
    }

    const baseMat = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
    const overMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      toneMapped: false,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    screenMesh.material = baseMat;
    const overlay = new THREE.Mesh(screenMesh.geometry, overMat);
    overlay.renderOrder = 2;
    screenMesh.add(overlay);

    // envMapIntensity is a three.js-only property glTF can't carry — the bake
    // tags the recoloured Space-Black materials; finish them here.
    const seen = new Set<THREE.Material>();
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => {
        if (!m || seen.has(m)) return;
        seen.add(m);
        if (m.userData?.spaceBlack && 'envMapIntensity' in m) {
          (m as THREE.MeshStandardMaterial).envMapIntensity = 0.85;
        }
      });
    });

    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;

    // Rig constants: prefer the values the bake embedded in the pivot's extras.
    const e = pivot.userData as Record<string, number>;
    const hingeY = pivot.position.y; // authored pivot position = hinge axis
    const hingeZ = pivot.position.z;
    const seat = {
      hingeY,
      hingeZ,
      relY: (e.screenBottomY ?? SEAT.SCREEN_BOTTOM_Y) - hingeY,
      relZ: (e.screenBottomZ ?? SEAT.SCREEN_BOTTOM_Z) - hingeZ,
      targetY: e.seatTargetY ?? SEAT.TARGET_Y,
      openX: e.lidOpenX ?? LID.OPEN_X,
      closedX: e.lidClosedX ?? LID.CLOSED_X,
    };

    const result: Rig = {
      pivot,
      baseMat,
      overMat,
      offset: [-c.x, -c.y, -c.z],
      scale: FIT_SIZE / maxDim,
      seat,
    };
    scene.userData.__riggedMacbook = result;
    return result;
  }, [scene]);

  useEffect(() => {
    onLoad?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rig]);

  // Latest props, readable from the frame loop without re-subscribing.
  const propsRef = useRef({ open, brightness, screenIndex, screenMix, autoPlayScreens });
  propsRef.current = { open, brightness, screenIndex, screenMix, autoPlayScreens };

  const playing = useRef<Set<number>>(new Set());

  useFrame(() => {
    const p = propsRef.current;
    const d = frameDriver?.() ?? {};
    const openNow = clamp01(d.open ?? p.open);
    const brightNow = clamp01(d.brightness ?? p.brightness);
    const idx = d.screenIndex ?? p.screenIndex;
    const mix = clamp01(d.screenMix ?? p.screenMix);

    // Lid hinge + dynamic seat lift: hold the screen's bottom edge at targetY
    // whenever the bare rotation would drop it lower (no keyboard clipping).
    const { pivot, baseMat, overMat, seat } = rig;
    pivot.rotation.x = seat.closedX + (seat.openX - seat.closedX) * openNow;
    const theta = pivot.rotation.x;
    const screenBottomY = seat.hingeY + seat.relY * Math.cos(theta) - seat.relZ * Math.sin(theta);
    const lift = Math.max(0, seat.targetY - screenBottomY);
    pivot.position.y = seat.hingeY + lift;

    baseMat.color.setScalar(brightNow);

    const textures = texturesRef.current;
    if (ready && textures.length > 0) {
      const i = Math.min(Math.max(0, idx), textures.length - 1);
      const nextI = Math.min(i + 1, textures.length - 1);
      // Swapping .map (incl. null→texture) toggles the USE_MAP shader define —
      // flag a recompile or the screen renders flat white.
      if (baseMat.map !== textures[i]) {
        baseMat.map = textures[i];
        baseMat.needsUpdate = true;
      }
      if (overMat.map !== textures[nextI]) {
        overMat.map = textures[nextI];
        overMat.needsUpdate = true;
      }
      overMat.opacity = nextI !== i ? mix : 0;

      if (p.autoPlayScreens) {
        const want = playing.current;
        want.clear();
        // Nothing decodes while the lid is (nearly) shut or the screen is dark.
        if (openNow > 0.01 && brightNow > 0) {
          want.add(i);
          if (mix > 0 && nextI !== i) want.add(nextI);
        }
        setPlaying(want);
      }
    }
  });

  useEffect(() => () => pauseAll(), [pauseAll]);

  return (
    <group ref={ref} {...groupProps}>
      <group scale={rig.scale}>
        <primitive object={scene} position={rig.offset} />
      </group>
    </group>
  );
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck` — Expected: PASS. (Known nuance: `GroupProps` comes from `@react-three/fiber`; if the fiber version in devDeps names it differently, use `ThreeElements['group']` instead and note it in the Interfaces block.)

- [ ] **Step 3: Commit**

```bash
git add src/Macbook.tsx
git commit -m "feat: headless rigged Macbook component (lid, seat lift, screen crossfade)"
```

---

### Task 8: `<MacbookLighting>` + `<MacbookStage>`

**Files:**
- Create: `src/MacbookLighting.tsx`, `src/MacbookStage.tsx`

**Interfaces:**
- Consumes: drei `Environment`, `Lightformer`; `types.ts` (`LightingPreset`).
- Produces:
  - `MacbookLighting({ preset?: LightingPreset; intensity?: number; children?: ReactNode })` — children REPLACE the preset entirely.
  - `MacbookStage({ lighting?: LightingPreset; lightingIntensity?: number; pauseWhenOffscreen?: boolean; className?: string; style?: CSSProperties; children: ReactNode; ...CanvasProps })` — wrapper div + configured `<Canvas>`.

- [ ] **Step 1: Write `src/MacbookLighting.tsx`** — `studio-dark` is the NOX rig verbatim (reference `MacbookCanvas.tsx` lines 150–175 of the nox repo):

```tsx
import type { FC, ReactNode } from 'react';
import { Environment, Lightformer } from '@react-three/drei';
import type { LightingPreset } from './types';

export interface MacbookLightingProps {
  /** Built-in rig to use. Default "studio-dark" — the tuned Space-Black look. */
  preset?: LightingPreset;
  /** Scales every light in the preset. Default 1. */
  intensity?: number;
  /** Escape hatch: children REPLACE the preset entirely (bring your own lights). */
  children?: ReactNode;
}

/**
 * Lighting rigs tuned for the Space-Black MacBook. "studio-dark" keeps the body
 * moody and lets a few crisp bright reflections carry it — the dark-body /
 * bright-streak contrast is what reads as anodised metal rather than lit plastic.
 */
export const MacbookLighting: FC<MacbookLightingProps> = ({ preset = 'studio-dark', intensity = 1, children }) => {
  if (children) return <>{children}</>;
  const k = intensity;

  if (preset === 'studio-dark') {
    return (
      <>
        <ambientLight intensity={0.1 * k} />
        {/* Soft warm key for gentle form on the matte parts (keyboard, bezel). */}
        <directionalLight position={[5, 8, 6]} intensity={1.15 * k} color="#ffeeda" />
        {/* Low cool fill — lifts the shadow side a touch without flattening. */}
        <directionalLight position={[-7, 3, 4]} intensity={0.18 * k} color="#c4d2ff" />
        {/* Cool back-rim glints the top edge, separating chassis from page. */}
        <directionalLight position={[-2, 6, -7]} intensity={1.0 * k} color="#e6eeff" />
        {/* Dark studio: mostly-dark environment with a few bright bands the
            metal reflects as streaks over a dark body. */}
        <Environment resolution={512} frames={1}>
          <Lightformer form="rect" intensity={1.5 * k} position={[1, 3, 6]} rotation={[-0.3, 0, 0]} scale={[8, 5, 1]} color="#ffe7d2" />
          <Lightformer form="rect" intensity={2.6 * k} position={[0, 6, -3]} rotation={[Math.PI / 2.2, 0, 0]} scale={[14, 1.6, 1]} color="#dde7ff" />
          <Lightformer form="rect" intensity={2.2 * k} position={[-3.4, 1, 6.5]} scale={[1.3, 9, 1]} color="#ffffff" />
          <Lightformer form="rect" intensity={1.5 * k} position={[3.6, 0, 6.5]} scale={[1, 9, 1]} color="#e6edff" />
          <Lightformer form="rect" intensity={0.18 * k} position={[0, -1, 8]} scale={[18, 12, 1]} color="#9fb0e0" />
          <Lightformer intensity={0.9 * k} position={[8, 1, 2]} rotation={[0, -Math.PI / 2, 0]} scale={[5, 7, 1]} color="#ffffff" />
          <Lightformer intensity={0.55 * k} position={[-8, 1, 2]} rotation={[0, Math.PI / 2, 0]} scale={[5, 7, 1]} color="#c4d2ff" />
        </Environment>
      </>
    );
  }

  if (preset === 'studio-light') {
    return (
      <>
        <ambientLight intensity={0.45 * k} />
        <directionalLight position={[5, 8, 6]} intensity={1.0 * k} color="#ffffff" />
        <directionalLight position={[-6, 4, 3]} intensity={0.35 * k} color="#eef2ff" />
        <Environment resolution={512} frames={1}>
          <Lightformer form="rect" intensity={2.0 * k} position={[0, 5, 5]} rotation={[-0.4, 0, 0]} scale={[12, 8, 1]} color="#ffffff" />
          <Lightformer form="rect" intensity={1.2 * k} position={[0, 0, 8]} scale={[20, 14, 1]} color="#f4f6ff" />
          <Lightformer form="rect" intensity={1.4 * k} position={[0, 6, -4]} rotation={[Math.PI / 2.2, 0, 0]} scale={[14, 2, 1]} color="#ffffff" />
          <Lightformer intensity={0.8 * k} position={[8, 1, 2]} rotation={[0, -Math.PI / 2, 0]} scale={[5, 7, 1]} color="#ffffff" />
          <Lightformer intensity={0.8 * k} position={[-8, 1, 2]} rotation={[0, Math.PI / 2, 0]} scale={[5, 7, 1]} color="#ffffff" />
        </Environment>
      </>
    );
  }

  // "soft": gentle, even, minimal drama.
  return (
    <>
      <ambientLight intensity={0.7 * k} />
      <directionalLight position={[3, 6, 4]} intensity={0.6 * k} color="#ffffff" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={1.0 * k} position={[0, 4, 6]} rotation={[-0.3, 0, 0]} scale={[16, 10, 1]} color="#ffffff" />
      </Environment>
    </>
  );
};
```

(`studio-light` and `soft` values are reasonable starting points — Task 12 visually verifies and tunes them.)

- [ ] **Step 2: Write `src/MacbookStage.tsx`**:

```tsx
import { useEffect, useRef, useState, type CSSProperties, type FC, type ReactNode } from 'react';
import { Canvas, type CanvasProps } from '@react-three/fiber';
import * as THREE from 'three';
import { MacbookLighting } from './MacbookLighting';
import type { LightingPreset } from './types';

export interface MacbookStageProps extends Omit<CanvasProps, 'children'> {
  /** Lighting preset for the stage. Default "studio-dark". */
  lighting?: LightingPreset;
  /** Scales the preset's lights. Default 1. */
  lightingIntensity?: number;
  /** Park the frameloop (and GPU) while the stage is off-screen. Default true. */
  pauseWhenOffscreen?: boolean;
  /** Wrapper div class/style — size the stage with these (defaults to 100%/100%). */
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * A ready-to-go stage: wrapper div + <Canvas> with the tuned camera (z 6, fov 32),
 * ACES filmic tone mapping, and a lighting preset. Drop a <Macbook> inside.
 * For existing R3F apps, skip this and use <Macbook> + <MacbookLighting> directly.
 */
export const MacbookStage: FC<MacbookStageProps> = ({
  lighting = 'studio-dark',
  lightingIntensity = 1,
  pauseWhenOffscreen = true,
  className,
  style,
  children,
  ...canvasProps
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    if (!pauseWhenOffscreen) return;
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => setInView(entries[0]?.isIntersecting ?? true),
      { rootMargin: '200px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [pauseWhenOffscreen]);

  return (
    <div ref={wrapRef} className={className} style={{ position: 'relative', width: '100%', height: '100%', ...style }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 32 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        frameloop={pauseWhenOffscreen ? (inView ? 'always' : 'never') : 'always'}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
        }}
        style={{ position: 'absolute', inset: 0 }}
        {...canvasProps}
      >
        <MacbookLighting preset={lighting} intensity={lightingIntensity} />
        {children}
      </Canvas>
    </div>
  );
};
```

- [ ] **Step 3: Typecheck and commit**

Run: `npm run typecheck` — Expected: PASS.

```bash
git add src/MacbookLighting.tsx src/MacbookStage.tsx
git commit -m "feat: lighting presets and canvas stage wrapper"
```

---

### Task 9: `<MacbookScroll>` + public exports + build

**Files:**
- Create: `src/MacbookScroll.tsx`, `src/index.ts`

**Interfaces:**
- Consumes: everything above — `journeyState`, `speedCapAt`, `resolveTimeline/Poses/Feel`, `smoothDamp`, `<Macbook>`, `<MacbookStage>`, `useCapabilityGate`.
- Produces:
```ts
export interface MacbookScrollHandle { scrollToScreen(index: number): void; readonly progress: number }
export interface MacbookScrollProps {
  screens: (string | ScreenSource)[];
  height?: string;                       // default '600vh'
  lighting?: LightingPreset;             // default 'studio-dark'
  timeline?: Partial<Timeline>;
  poses?: PosesPartial;
  feel?: Partial<Feel>;
  pointerParallax?: boolean;             // default true
  fallback?: ReactNode;                  // rendered instead when incapable
  className?: string;
  modelSrc?: string;
  onProgress?: (p: number) => void;
  onActiveScreen?: (index: number) => void;
  children?: ReactNode;                  // overlay content inside the sticky viewport
}
export const MacbookScroll: ForwardRefExoticComponent<MacbookScrollProps & RefAttributes<MacbookScrollHandle>>;
```
- `src/index.ts` re-exports the full public surface (listed in Step 3).

- [ ] **Step 1: Write `src/MacbookScroll.tsx`**

```tsx
import {
  forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { Macbook, type MacbookFrameState } from './Macbook';
import { MacbookStage } from './MacbookStage';
import { useCapabilityGate } from './useCapabilityGate';
import { journeyState, speedCapAt } from './journey';
import { resolveTimeline, resolvePoses, resolveFeel, type PosesPartial } from './constants';
import { clamp01, smoothDamp } from './math';
import type { ScreenSource, Timeline, Feel, LightingPreset } from './types';

export interface MacbookScrollHandle {
  /** Smooth-scroll the page so the journey lands on screen `index`. */
  scrollToScreen(index: number): void;
  /** Current smoothed journey progress, 0–1. */
  readonly progress: number;
}

export interface MacbookScrollProps {
  /** The screen walkthrough content, in order. */
  screens: (string | ScreenSource)[];
  /** Total scroll length of the pinned journey. Default '600vh'. */
  height?: string;
  /** Lighting preset. Default 'studio-dark'. */
  lighting?: LightingPreset;
  /** Override any journey beats; unspecified beats keep the tuned defaults. */
  timeline?: Partial<Timeline>;
  /** Override any pose values; unspecified values keep the tuned defaults. */
  poses?: PosesPartial;
  /** Override the scroll feel; unspecified values keep the tuned defaults. */
  feel?: Partial<Feel>;
  /** Cursor-follow tilt once dived in. Default true. */
  pointerParallax?: boolean;
  /** Rendered INSTEAD of the journey when the client lacks WebGL2 or prefers reduced motion. */
  fallback?: ReactNode;
  className?: string;
  /** Self-hosting escape hatch — see <Macbook modelSrc>. */
  modelSrc?: string;
  /** Fires with the smoothed progress whenever it changes. */
  onProgress?: (p: number) => void;
  /** Fires when the dominant screen changes — drive tab bars/captions from this. */
  onActiveScreen?: (index: number) => void;
  /** Overlay content rendered inside the sticky viewport, above the canvas. */
  children?: ReactNode;
}

/** Inner R3F component: drives pose + parallax per frame from the shared refs. */
function ScrollRig({
  groupRef, progressRef, pointerRef, timeline, poses, feel, count, pointerParallax,
}: {
  groupRef: React.MutableRefObject<THREE.Group | null>;
  progressRef: React.MutableRefObject<number>;
  pointerRef: React.MutableRefObject<{ x: number; y: number; active: boolean }>;
  timeline: Timeline;
  poses: ReturnType<typeof resolvePoses>;
  feel: Feel;
  count: number;
  pointerParallax: boolean;
}) {
  const tilt = useRef({ x: 0, y: 0 });
  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const p = progressRef.current;
    const s = journeyState(p, timeline, poses, count, feel.crossfadeFraction);

    // Parallax fades in with the dive; the device never moves unless the user does.
    const diveT = (s.pose.scale - poses.intro.scale) / (poses.dive.scale - poses.intro.scale || 1);
    const influence = pointerParallax ? clamp01(diveT) : 0;
    const ptr = pointerRef.current;
    const wantY = ptr.active ? ptr.x * 0.14 * influence : 0;
    const wantX = ptr.active ? ptr.y * 0.09 * influence : 0;
    tilt.current.y += (wantY - tilt.current.y) * 0.08;
    tilt.current.x += (wantX - tilt.current.x) * 0.08;

    g.scale.setScalar(s.pose.scale);
    g.rotation.y = s.pose.yaw + tilt.current.y;
    g.rotation.x = s.pose.pitch + tilt.current.x;
    g.position.x = s.pose.x;
    g.position.y = s.pose.y;
  });
  return null;
}

/**
 * The full scroll journey (the NOX homepage effect) with zero scroll-library
 * dependencies: a tall wrapper pins a sticky viewport; scroll maps to a target
 * progress; a critically-damped follow (with per-phase speed caps) chases it,
 * so wheel steps become fluid motion and everything reverses exactly.
 */
export const MacbookScroll = forwardRef<MacbookScrollHandle, MacbookScrollProps>(function MacbookScroll(
  {
    screens,
    height = '600vh',
    lighting = 'studio-dark',
    timeline: timelineIn,
    poses: posesIn,
    feel: feelIn,
    pointerParallax = true,
    fallback = null,
    className,
    modelSrc,
    onProgress,
    onActiveScreen,
    children,
  },
  ref,
) {
  const capable = useCapabilityGate();
  const timeline = useMemo(() => resolveTimeline(timelineIn), [timelineIn]);
  const poses = useMemo(() => resolvePoses(posesIn), [posesIn]);
  const feel = useMemo(() => resolveFeel(feelIn), [feelIn]);
  const count = screens.length;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const stageWrapRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0, active: false });
  const groupRef = useRef<THREE.Group | null>(null);
  const [activeScreen, setActiveScreen] = useState(0);
  const activeRef = useRef(0);

  // Scroll → target; rAF chases it with the damped, speed-capped follow.
  useEffect(() => {
    if (!capable) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    let target = 0;
    let raf = 0;
    let last = performance.now();
    const vel = { current: 0 };
    let renderedAt = NaN;

    const measure = () => {
      const rect = wrapper.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const len = wrapper.offsetHeight - window.innerHeight;
      target = len > 0 ? clamp01((window.scrollY - top) / len) : 0;
    };
    measure();
    // Prime at the current position (deep links land settled, not animating in).
    progressRef.current = target;

    const render = () => {
      const sp = progressRef.current;
      // deviceIn fade/rise is DOM-side (opacity + translate on the stage wrapper).
      const s = journeyState(sp, timeline, poses, count, feel.crossfadeFraction);
      const el = stageWrapRef.current;
      if (el) {
        el.style.opacity = String(s.deviceIn);
        el.style.transform = `translateY(${56 * (1 - s.deviceIn)}px)`;
      }
      if (s.screenIndex !== activeRef.current) {
        activeRef.current = s.screenIndex;
        setActiveScreen(s.screenIndex);
        onActiveScreen?.(s.screenIndex);
      }
      onProgress?.(sp);
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      measure();
      const sp = progressRef.current;
      if (sp === target && vel.current === 0 && renderedAt === sp) return; // idle
      const cap = speedCapAt(sp, timeline, feel, count);
      let next = smoothDamp(sp, target, vel, feel.smoothTime, dt, cap);
      if (Math.abs(next - target) < 1e-4 && Math.abs(vel.current) < 2e-3) {
        next = target;
        vel.current = 0;
      }
      progressRef.current = next;
      render();
      renderedAt = next;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [capable, timeline, poses, feel, count, onProgress, onActiveScreen]);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = wrapperRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    pointerRef.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointerRef.current.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    pointerRef.current.active = true;
  }, []);
  const onLeave = useCallback(() => {
    pointerRef.current.active = false;
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      scrollToScreen(index: number) {
        const wrapper = wrapperRef.current;
        if (!wrapper || count === 0) return;
        const rect = wrapper.getBoundingClientRect();
        const top = rect.top + window.scrollY;
        const len = wrapper.offsetHeight - window.innerHeight;
        const [s0, s1] = timeline.screens;
        const p = s0 + ((index + 0.5) / count) * (s1 - s0);
        window.scrollTo({ top: top + p * len, behavior: 'smooth' });
      },
      get progress() {
        return progressRef.current;
      },
    }),
    [count, timeline],
  );

  const frameDriver = useCallback((): MacbookFrameState => {
    const s = journeyState(progressRef.current, timeline, poses, count, feel.crossfadeFraction);
    return { open: s.open, brightness: s.brightness, screenIndex: s.screenIndex, screenMix: s.screenMix };
  }, [timeline, poses, count, feel.crossfadeFraction]);

  if (capable === null) return <div className={className} style={{ height }} />;
  if (!capable) return <div className={className}>{fallback}</div>;

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{ position: 'relative', height }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      data-active-screen={activeScreen}
    >
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
        <div ref={stageWrapRef} style={{ position: 'absolute', inset: 0, opacity: 0 }}>
          <MacbookStage lighting={lighting}>
            <group ref={groupRef}>
              <Macbook screens={screens} frameDriver={frameDriver} modelSrc={modelSrc} />
            </group>
            <ScrollRig
              groupRef={groupRef}
              progressRef={progressRef}
              pointerRef={pointerRef}
              timeline={timeline}
              poses={poses}
              feel={feel}
              count={count}
              pointerParallax={pointerParallax}
            />
          </MacbookStage>
        </div>
        {children}
      </div>
    </div>
  );
});
```

- [ ] **Step 2: Write `src/index.ts`**

```ts
export { Macbook, type MacbookProps, type MacbookFrameState } from './Macbook';
export { MacbookLighting, type MacbookLightingProps } from './MacbookLighting';
export { MacbookStage, type MacbookStageProps } from './MacbookStage';
export { MacbookScroll, type MacbookScrollProps, type MacbookScrollHandle } from './MacbookScroll';
export { useScreenTextures } from './useScreenTextures';
export { useCapabilityGate } from './useCapabilityGate';
export { screenAt } from './screenAt';
export { journeyState, speedCapAt, type JourneyState } from './journey';
export { ramp, easeInOut, lerp, clamp01, smoothDamp } from './math';
export {
  DEFAULT_MODEL_URL, DEFAULT_TIMELINE, DEFAULT_POSES, DEFAULT_FEEL, LID, SEAT, FIT_SIZE,
  resolveTimeline, resolvePoses, resolveFeel, type PosesPartial,
} from './constants';
export type { ScreenInput, ScreenSource, Timeline, Pose, Poses, Feel, LightingPreset } from './types';
```

- [ ] **Step 3: Typecheck, test, build**

Run: `npm run typecheck && npm test && npm run build`
Expected: all pass; `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts` exist; `head -c 200 dist/index.js` starts with `"use client";`; `grep -c "0.1.0" dist/index.js` ≥ 1 (version injected into the model URL).

- [ ] **Step 4: Commit**

```bash
git add src/MacbookScroll.tsx src/index.ts
git commit -m "feat: zero-dependency scroll journey driver and public exports"
```

---

### Task 10: Demo app scaffold + playground page

**Files:**
- Create: `demo/package.json`, `demo/vite.config.ts`, `demo/tsconfig.json`, `demo/index.html`, `demo/src/main.tsx`, `demo/src/App.tsx`, `demo/src/Playground.tsx`, `demo/src/styles.css`, `demo/public/macbook-rigged.glb` (copied), `demo/public/videos/*` (copied)

**Interfaces:**
- Consumes: the built package via `"rigged-macbook-3d": "file:.."`.
- Produces: `npm --prefix demo run dev` serving the demo on Vite's default port; `App` renders `<Journey />` (Task 11 — stub it as `<div id="journey-stub" />` for now) then `<Playground />`.

- [ ] **Step 1: Copy assets**

```bash
mkdir -p demo/public/videos demo/src
cp assets/macbook-rigged.glb demo/public/macbook-rigged.glb
for n in inbox1 replies1 triage1 search1 private1; do
  cp /Users/williamlaverty/Projects/NOX/nox-website/public/$n.webm demo/public/videos/ 2>/dev/null;
  cp /Users/williamlaverty/Projects/NOX/nox-website/public/$n.mp4 demo/public/videos/ 2>/dev/null;
done
ls demo/public/videos/
```
Expected: 10 files (5 webm + 5 mp4). If any are missing, list what IS in `nox-website/public/*.webm` and use the five demo videos found there (they are referenced by `src/components/MacbookSection/data.ts` on nox-website main).

- [ ] **Step 2: Write demo config files**

`demo/package.json`:
```json
{
  "name": "rigged-macbook-3d-demo",
  "private": true,
  "type": "module",
  "scripts": { "dev": "vite", "build": "tsc --noEmit && vite build", "preview": "vite preview" },
  "dependencies": {
    "@react-three/drei": "^10.7.7",
    "@react-three/fiber": "^9.6.1",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "rigged-macbook-3d": "file:..",
    "three": "^0.180.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^5.0.0",
    "typescript": "^5.6.0",
    "vite": "^7.0.0"
  }
}
```
(Adjust three/fiber/drei versions to the majors installed in the root devDeps if these ranges fail to resolve — the demo must use the SAME three instance family as the package peers.)

`demo/vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // file:.. dependency: dedupe so the linked package resolves ONE copy of three/react.
  resolve: { dedupe: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei'] },
});
```

`demo/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022", "module": "ESNext", "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM"], "jsx": "react-jsx", "strict": true,
    "skipLibCheck": true, "noEmit": true, "isolatedModules": true
  },
  "include": ["src"]
}
```

`demo/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>rigged-macbook-3d — a genuinely rigged 3D MacBook for React</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Write `demo/src/styles.css`, `main.tsx`, `App.tsx`**

`demo/src/styles.css`:
```css
* { margin: 0; box-sizing: border-box; }
body { background: #000; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.hero { min-height: 60vh; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 16px; text-align: center; padding: 48px 24px; }
.hero h1 { font-size: clamp(32px, 5vw, 56px); letter-spacing: -0.03em; }
.hero p { color: rgba(255, 255, 255, 0.6); max-width: 40em; line-height: 1.5; }
.hero code { background: rgba(255, 255, 255, 0.08); padding: 3px 10px; border-radius: 8px; font-size: 15px; }
.playground { max-width: 1100px; margin: 0 auto; padding: 64px 24px; }
.playground h2 { font-size: 28px; letter-spacing: -0.02em; margin-bottom: 8px; }
.playground .stage { height: 560px; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; overflow: hidden; margin: 24px 0; }
.controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; }
.controls label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: rgba(255, 255, 255, 0.7); }
.tabbar { position: absolute; left: 50%; transform: translateX(-50%); bottom: 10vh; display: inline-flex; gap: 2px; padding: 5px; border-radius: 999px; background: #f4f4f5; box-shadow: 0 8px 28px rgba(9, 9, 11, 0.18); }
.tabbar button { appearance: none; border: none; background: transparent; cursor: pointer; padding: 9px 18px; border-radius: 999px; font-size: 15px; font-weight: 500; color: #71717a; }
.tabbar button.active { background: #fff; color: #18181b; box-shadow: 0 1px 2px rgba(9, 9, 11, 0.12); }
footer { padding: 48px 24px; text-align: center; color: rgba(255, 255, 255, 0.45); font-size: 14px; line-height: 1.6; }
footer a { color: rgba(255, 255, 255, 0.7); }
```

`demo/src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`demo/src/App.tsx` (Journey is a stub until Task 11):
```tsx
import Playground from './Playground';

export default function App() {
  return (
    <>
      <header className="hero">
        <h1>rigged-macbook-3d</h1>
        <p>
          A genuinely rigged 3D MacBook for React — a real hinge, a real screen, real studio
          lighting. Scroll to open it, or drive every parameter yourself below.
        </p>
        <code>npm i rigged-macbook-3d three @react-three/fiber @react-three/drei</code>
      </header>
      <div id="journey-stub" />
      <Playground />
      <footer>
        Model: “MacBook Pro M3 16-inch 2024” by jackbaeten (CC-BY 4.0) · rigged by William
        Laverty · <a href="https://github.com/williamlaverty/rigged-macbook-3d">GitHub</a>
      </footer>
    </>
  );
}
```

- [ ] **Step 4: Write `demo/src/Playground.tsx`** — the headless-API showcase:

```tsx
import { useState } from 'react';
import { Macbook, MacbookStage, type LightingPreset } from 'rigged-macbook-3d';

/** Sliders driving <Macbook> props directly — the headless API, visible. */
export default function Playground() {
  const [open, setOpen] = useState(1);
  const [brightness, setBrightness] = useState(1);
  const [yaw, setYaw] = useState(-0.4);
  const [pitch, setPitch] = useState(0.15);
  const [mix, setMix] = useState(0);
  const [lighting, setLighting] = useState<LightingPreset>('studio-dark');

  return (
    <section className="playground">
      <h2>Playground — the headless API</h2>
      <p>Every value below is just a prop on <code>&lt;Macbook&gt;</code>.</p>
      <div className="stage">
        <MacbookStage lighting={lighting}>
          <group rotation={[pitch, yaw, 0]}>
            <Macbook
              modelSrc="/macbook-rigged.glb"
              open={open}
              brightness={brightness}
              screens={[
                { src: '/videos/inbox1.webm', fallbackSrc: '/videos/inbox1.mp4' },
                { src: '/videos/replies1.webm', fallbackSrc: '/videos/replies1.mp4' },
              ]}
              screenIndex={0}
              screenMix={mix}
            />
          </group>
        </MacbookStage>
      </div>
      <div className="controls">
        <label>open: {open.toFixed(2)}
          <input type="range" min="0" max="1" step="0.01" value={open} onChange={(e) => setOpen(+e.target.value)} />
        </label>
        <label>brightness: {brightness.toFixed(2)}
          <input type="range" min="0" max="1" step="0.01" value={brightness} onChange={(e) => setBrightness(+e.target.value)} />
        </label>
        <label>screenMix: {mix.toFixed(2)}
          <input type="range" min="0" max="1" step="0.01" value={mix} onChange={(e) => setMix(+e.target.value)} />
        </label>
        <label>yaw: {yaw.toFixed(2)}
          <input type="range" min="-1.2" max="1.2" step="0.01" value={yaw} onChange={(e) => setYaw(+e.target.value)} />
        </label>
        <label>pitch: {pitch.toFixed(2)}
          <input type="range" min="-0.5" max="0.8" step="0.01" value={pitch} onChange={(e) => setPitch(+e.target.value)} />
        </label>
        <label>lighting
          <select value={lighting} onChange={(e) => setLighting(e.target.value as LightingPreset)}>
            <option value="studio-dark">studio-dark</option>
            <option value="studio-light">studio-light</option>
            <option value="soft">soft</option>
          </select>
        </label>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Install, run, verify**

Run: `npm run build && npm --prefix demo install && npm --prefix demo run dev` (background)
Then load `http://localhost:5173` in a browser (or curl the root for a 200). Verify in the served page: the playground renders the Space-Black MacBook; the `open` slider swings the lid with no keyboard clipping; the screen shows the inbox video; `screenMix` dissolves to the replies video; presets switch. (Full screenshot verification happens in Task 12 — here a quick manual load is enough to catch hard failures.)

- [ ] **Step 6: Commit**

```bash
git add demo/package.json demo/package-lock.json demo/vite.config.ts demo/tsconfig.json demo/index.html demo/src demo/public/macbook-rigged.glb demo/public/videos
git commit -m "feat: demo app with headless-API playground"
```

---

### Task 11: Demo journey page + tab bar example

**Files:**
- Create: `demo/src/Journey.tsx`, `demo/src/TabBar.tsx`
- Modify: `demo/src/App.tsx` (replace `<div id="journey-stub" />` with `<Journey />`)

**Interfaces:**
- Consumes: `MacbookScroll`, `MacbookScrollHandle` from the package.
- Produces: the full scroll journey with a working tab-bar overlay (the copy-paste example the README points at).

- [ ] **Step 1: Write `demo/src/TabBar.tsx`**

```tsx
/** Example overlay: a segmented tab bar driven entirely by MacbookScroll's
 *  onActiveScreen callback + scrollToScreen handle. Plain DOM — copy freely. */
export default function TabBar({
  labels, active, onSelect,
}: {
  labels: string[];
  active: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="tabbar" role="tablist" aria-label="Screens">
      {labels.map((label, i) => (
        <button key={label} role="tab" aria-selected={i === active} className={i === active ? 'active' : ''} onClick={() => onSelect(i)}>
          {label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write `demo/src/Journey.tsx`**

```tsx
import { useRef, useState } from 'react';
import { MacbookScroll, type MacbookScrollHandle } from 'rigged-macbook-3d';
import TabBar from './TabBar';

const SCREENS = [
  { src: '/videos/inbox1.webm', fallbackSrc: '/videos/inbox1.mp4', label: 'Inbox' },
  { src: '/videos/replies1.webm', fallbackSrc: '/videos/replies1.mp4', label: 'Replies' },
  { src: '/videos/triage1.webm', fallbackSrc: '/videos/triage1.mp4', label: 'Triage' },
  { src: '/videos/search1.webm', fallbackSrc: '/videos/search1.mp4', label: 'Search' },
  { src: '/videos/private1.webm', fallbackSrc: '/videos/private1.mp4', label: 'Private' },
];

/** The full scroll journey: pin, lid open, dive, screen walkthrough, recede. */
export default function Journey() {
  const scrollRef = useRef<MacbookScrollHandle>(null);
  const [active, setActive] = useState(0);

  return (
    <MacbookScroll
      ref={scrollRef}
      height="600vh"
      screens={SCREENS}
      modelSrc="/macbook-rigged.glb"
      onActiveScreen={setActive}
      fallback={
        <div className="hero">
          <p>This demo needs WebGL2 and motion enabled — here’s a quiet fallback instead.</p>
        </div>
      }
    >
      <TabBar labels={SCREENS.map((s) => s.label)} active={active} onSelect={(i) => scrollRef.current?.scrollToScreen(i)} />
    </MacbookScroll>
  );
}
```

- [ ] **Step 3: Wire into `App.tsx`** — replace `<div id="journey-stub" />` with `<Journey />` and add `import Journey from './Journey';`.

- [ ] **Step 4: Verify in the browser**

With the dev server running: scrolling from the hero pins the section; the device fades/rises in closed at the intro pose; the lid opens; the camera dives; the five videos walk through with crossfades and the tab bar follows; clicking a tab smooth-scrolls to that screen; the device recedes at the end and the page unpins. Scroll UP and confirm every phase reverses smoothly.

- [ ] **Step 5: Commit**

```bash
git add demo/src/Journey.tsx demo/src/TabBar.tsx demo/src/App.tsx
git commit -m "feat: demo scroll journey with tab bar overlay example"
```

---

### Task 12: Visual verification + tuning

**Files:**
- Possibly modify: `src/MacbookLighting.tsx`, `src/constants.ts`, `src/useScreenTextures.ts` (only if defects found)

- [ ] **Step 1: Screenshot the demo at key beats**

Use the local Playwright workflow (per project memory: MCP Playwright is broken — use `playwright-core` from the npx cache + cached Chrome-for-Testing; Locators, `waitUntil: 'load'`). With the demo dev server running, write a throwaway script `/tmp/shot-macbook.mjs` that: opens `http://localhost:5173` at 1440×900, then for each scroll progress in `[0, 0.15, 0.35, 0.55, 0.75, 0.85, 1.0]` of the journey wrapper's scrollable length, sets `window.scrollTo(0, wrapperTop + p * (wrapperHeight - innerHeight))`, waits 1200 ms (the damped follow needs to settle), and screenshots to `/tmp/mbk-{p}.png`. Also screenshot the playground section with `open` at 0 and 1 (drive the slider via `page.fill`/`evaluate`).

- [ ] **Step 2: Review the screenshots against the reference**

Compare with the NOX homepage look (reference image proportions: Space-Black body, crisp bright streak reflections, dark moody shadows, screen legible). Checklist:
- Lid closed (p≈0.35): screen not clipping into the keyboard; no gap at the hinge.
- Lid open (p≈0.75): screen video visible, upright (NOT vertically mirrored — if mirrored, set `flipY` on image/video textures in `useScreenTextures.ts` to match the GLB's UV convention and re-verify).
- Materials: body reads as dark anodised metal with bright streaks, not grey plastic (if flat, check `envMapIntensity` is applied — the `spaceBlack` userData tag must survive the meshopt write).
- Crossfade mid-band (p≈0.85): two videos blending, no white flash.
- Playground `open=0`→`1` sweep: smooth hinge, no clipping at any angle.

- [ ] **Step 3: Fix anything found, re-shoot, repeat until clean.** Typical fixes live in `MacbookLighting.tsx` (preset values), `constants.ts` (pose defaults), `useScreenTextures.ts` (flipY). Keep fixes minimal and re-run `npm test && npm run typecheck` after each.

- [ ] **Step 4: Save one hero screenshot** (the dived-in open pose) to `docs/media/hero.png` in the repo — the README uses it.

- [ ] **Step 5: Commit**

```bash
git add docs/media/hero.png  # plus any tuned source files
git commit -m "fix: visual tuning from screenshot verification + hero media"
```

---

### Task 13: README, llms.txt, CHANGELOG

**Files:**
- Create: `README.md`, `llms.txt`, `CHANGELOG.md`

**Interfaces:**
- Consumes: the final public API from `src/index.ts` — prop tables MUST be generated by reading the actual source JSDoc, not from memory.

- [ ] **Step 1: Write `README.md`** with EXACTLY these sections, in order:

1. **Title + one-liner + hero image** (`docs/media/hero.png`) + badges-free (no CI yet) + link to the live demo (placeholder URL `https://rigged-macbook-3d-demo.vercel.app` — Task 16 fixes the real one).
2. **Why this exists** — 2 short paragraphs: existing "macbook scroll" libraries are CSS image mockups; this is a real rigged GLB (hinge, screen, materials) you can animate freely in any R3F scene.
3. **Install** — `npm i rigged-macbook-3d three @react-three/fiber @react-three/drei` with a peer-deps note (React ≥18).
4. **Quickstart** — verbatim:
```tsx
import { Macbook, MacbookStage } from 'rigged-macbook-3d';

export default function Hero() {
  return (
    <div style={{ height: 600 }}>
      <MacbookStage lighting="studio-dark">
        <Macbook open={1} screen="/demo.mp4" />
      </MacbookStage>
    </div>
  );
}
```
5. **The scroll journey** — the `MacbookScroll` example from `demo/src/Journey.tsx` (trimmed), with the timeline/poses/feel override syntax and a link to the demo source.
6. **API reference** — one prop table per component (`Macbook`, `MacbookLighting`, `MacbookStage`, `MacbookScroll`) with columns Prop / Type / Default / Description, transcribed from the source JSDoc; then a short "Hooks & utilities" list (`useScreenTextures`, `useCapabilityGate`, `screenAt`, `journeyState`, `speedCapAt`, math functions, defaults/constants).
7. **Recipes** — four short code snippets: open-on-hover (spring `open` with react-spring or a simple lerp in `frameDriver`), rotate-with-mouse (group rotation from pointer), Framer Motion binding (`frameDriver={() => ({ open: motionValue.get() })}`), custom lighting (children of `MacbookLighting`).
8. **Next.js note** — client component; with the App Router use `next/dynamic` + `ssr: false` for the stage/scroll components.
9. **The model** — bundled, versioned CDN URL by default; self-host by copying `node_modules/rigged-macbook-3d/assets/macbook-rigged.glb`; **no other model works** (the rig is welded to this file); one `<Macbook>` instance per page (the cached GLTF scene is shared — known v0.1 limitation).
10. **Fallbacks & accessibility** — the capability gate (WebGL2, `prefers-reduced-motion`), the `fallback` prop, guidance to provide meaningful non-3D content.
11. **Credits & license** — MIT for code; model CC-BY 4.0 by jackbaeten (link), modifications noted; Apple trademark note. Link CREDITS.md.

- [ ] **Step 2: Write `llms.txt`** — a compact, self-contained spec for AI agents:

```
# rigged-macbook-3d

> React + three.js component library: a genuinely rigged 3D MacBook (openable lid on a
> real hinge, video/image screen with crossfade, studio lighting presets, optional
> zero-dependency scroll journey). Peer deps: react>=18, three>=0.160,
> @react-three/fiber>=8, @react-three/drei>=9.122.

Install: npm i rigged-macbook-3d three @react-three/fiber @react-three/drei
All components are client components (Next.js App Router: dynamic import, ssr:false).
The 3D model is bundled and fixed — never pass a different GLB to modelSrc.
One <Macbook> instance per page.
```
…followed by: the full export list with signatures (copy from `src/index.ts` + JSDoc), the three canonical snippets (static stage, scroll journey with tab bar, frameDriver binding), the default timeline/poses/feel values as JSON, and the fallback-gate explanation. Everything an agent needs with zero further file reads.

- [ ] **Step 3: Write `CHANGELOG.md`**

```markdown
# Changelog

## 0.1.0 — 2026-08-20

Initial release: rigged MacBook model (hinge + seat-lift + screen crossfade),
lighting presets (studio-dark / studio-light / soft), MacbookStage canvas wrapper,
zero-dependency MacbookScroll journey driver, capability gate, demo app.
```

- [ ] **Step 4: Commit**

```bash
git add README.md llms.txt CHANGELOG.md
git commit -m "docs: README, llms.txt, and changelog"
```

---

### Task 14: GitHub repo + push

- [ ] **Step 1: Create the repo and push**

```bash
cd /Users/williamlaverty/Projects/labs/rigged-macbook-3d
git branch -M main
gh repo create rigged-macbook-3d --public --description "A genuinely rigged 3D MacBook for React — real hinge, real screen, studio lighting, optional scroll journey. three.js / @react-three/fiber." --source . --push
```
Expected: repo created under the personal account; `git remote -v` shows origin; push succeeds.

- [ ] **Step 2: Verify**

Run: `gh repo view --web=false --json url,description` — Expected: the URL matches the `repository` field in package.json (fix package.json + commit + push if the username differs).

---

### Task 15: Publish v0.1.0 to npm + verify CDN

- [ ] **Step 1: Final pre-publish check**

Run: `npm run typecheck && npm test && npm run build && npm pack --dry-run`
Expected: pack list contains ONLY `dist/*`, `assets/macbook-rigged.glb`, `README.md`, `CREDITS.md`, `LICENSE`, `package.json` — NOT `assets/macbook-source.glb`, `demo/`, `src/`, `scripts/`, `docs/`. Fix `files` in package.json if anything extra appears.

- [ ] **Step 2: Publish**

Run: `npm publish`
Expected: `+ rigged-macbook-3d@0.1.0`. (If the name is taken, STOP and report — the user must choose a new name; do not publish under a scope unilaterally.)

- [ ] **Step 3: Verify the CDN model URL resolves**

Run: `curl -sIL "https://unpkg.com/rigged-macbook-3d@0.1.0/assets/macbook-rigged.glb" | head -20`
Expected: final response `200` with a content-length ≈ the baked GLB size. (unpkg can take a couple of minutes to see a fresh publish — retry with a 60s wait, up to 5 times.)

- [ ] **Step 4: Prove the published package works end-to-end**

```bash
cd /tmp && rm -rf rmb-smoke && npm create vite@latest rmb-smoke -- --template react-ts >/dev/null 2>&1 && cd rmb-smoke
npm i >/dev/null 2>&1 && npm i rigged-macbook-3d three @react-three/fiber @react-three/drei >/dev/null 2>&1
```
Replace `src/App.tsx` with the README quickstart (using the DEFAULT model URL — no `modelSrc`), run `npm run build`. Expected: builds clean. Then `npm run dev` + a Playwright screenshot showing the MacBook rendered from the CDN model. This validates spec success criterion 1.

- [ ] **Step 5: Tag the release**

```bash
cd /Users/williamlaverty/Projects/labs/rigged-macbook-3d
git tag v0.1.0 && git push origin main --tags
```

---

### Task 16: Deploy the demo to Vercel + final links

**Files:**
- Create: `vercel.json`
- Modify: `README.md` (real demo URL)

- [ ] **Step 1: Write `vercel.json`** (repo root — the demo needs the parent package for `file:..`):

```json
{
  "buildCommand": "npm run build:demo",
  "outputDirectory": "demo/dist",
  "installCommand": "npm install"
}
```

- [ ] **Step 2: Verify the build command works locally**

Run: `npm run build:demo` — Expected: `demo/dist/index.html` exists.

- [ ] **Step 3: Deploy**

```bash
vercel link --yes --project rigged-macbook-3d-demo
vercel deploy --prod --yes
```
Expected: a production URL. Load it (curl 200 + a Playwright screenshot of the journey) to confirm the deployed demo works — including the model file (served from `demo/public/`).

- [ ] **Step 4: Fix the README demo link to the real production URL**, then commit and push:

```bash
git add vercel.json README.md
git commit -m "chore: deploy demo to Vercel and link it from the README"
git push
```

- [ ] **Step 5: Final report** — summarise for the user: repo URL, npm package URL, demo URL, what was verified (tests, visual checks, CDN smoke test), and the one known limitation (single instance per page).

---

## Self-Review (completed)

1. **Spec coverage:** §3.1 Macbook → Task 7; §3.2 lighting → Task 8; §3.3 stage → Task 8; §3.4 scroll (incl. capability gate + fallback) → Tasks 4, 6, 9; §3.5 exports → Task 9; §4 exclusions honoured (no gate/autoplay/typewriter/wave anywhere); §5 model/bake → Task 5 (verification §5.2 gate → Task 12); §5.4 CDN default + self-host → Tasks 3, 15; §6 layout → File Structure; §7 build/test/publish → Tasks 1, 9, 15; §8 licensing → Tasks 1, 5, 13; §9 docs → Task 13; §10 success criteria → Tasks 10–12 (1, 2), Task 1/9 (3), Task 13 (4), Tasks 15–16 (5). One deliberate deviation from spec §2: drei is a peer dep, not a regular dep (reason in Global Constraints).
2. **Placeholder scan:** no TBDs; all code steps carry full code; README/llms.txt steps specify exact sections and verbatim key snippets.
3. **Type consistency:** `MacbookFrameState`/`frameDriver` (Tasks 7→9), `ScreenSource.label` (Tasks 3→11), `PosesPartial` (Tasks 3→9), `MacbookScrollHandle.scrollToScreen` (Tasks 9→11), `journeyState`/`speedCapAt` signatures (Tasks 4→9) all match.
