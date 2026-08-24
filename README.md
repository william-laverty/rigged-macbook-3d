<div align="center">

# Rigged MacBook Pro 3D Model

**An animatable MacBook Pro 3D model for web.**

Transform the MacBook in a 3D scene... animate the lid opening... play your product video on screen...

[**Live demo**](https://rigged-macbook-3d-demo.vercel.app) · [Quick start](#quick-start) · [API](#api-reference) · [Changelog](https://github.com/william-laverty/rigged-macbook-3d/blob/main/CHANGELOG.md)

[![npm](https://img.shields.io/npm/v/rigged-macbook-3d)](https://www.npmjs.com/package/rigged-macbook-3d)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/william-laverty/rigged-macbook-3d/blob/main/LICENSE)
[![React 18+](https://img.shields.io/badge/react-%E2%89%A518-brightgreen)](https://react.dev)
[![three.js](https://img.shields.io/badge/three.js-%E2%89%A50.160-black)](https://threejs.org)

<img src="https://raw.githubusercontent.com/william-laverty/rigged-macbook-3d/main/docs/media/hero.png" alt="A Space Black MacBook mid-scroll-journey, lid open, screen playing a product video" width="100%">

</div>

## Quick start

```bash
npm i rigged-macbook-3d three @react-three/fiber @react-three/drei
```

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

That's the whole integration: a lit stage, an open MacBook, your video on the screen. The package
itself is **7.6 kB gzipped with zero runtime dependencies** — `three` and R3F stay peers, so it adds
nothing you aren't already shipping.

## Scroll to open it

`<MacbookScroll>` is the full pinned journey — the device rises in, the lid swings open, the
camera dives toward the screen, and your videos crossfade one into the next. No GSAP, no Lenis,
no scroll library at all.

```tsx
import { MacbookScroll } from 'rigged-macbook-3d';

<MacbookScroll
  height="600vh"
  screens={[
    { src: '/inbox.webm', fallbackSrc: '/inbox.mp4', label: 'Inbox' },
    { src: '/search.webm', fallbackSrc: '/search.mp4', label: 'Search' },
  ]}
  onActiveScreen={setActive}
/>
```

Every beat is a `[start, end]` pair on 0–1 scroll progress, and every one is overridable:

| Beat | Default | What happens |
| --- | --- | --- |
| `deviceIn` | `0 → 0.25` | Device fades and rises into frame |
| `lidOpen` | `0.45 → 0.62` | Lid rotates open; the screen wakes behind it |
| `dive` | `0.58 → 0.73` | Camera dives in toward the display |
| `screens` | `0.73 → 0.92` | Walkthrough — your screens crossfade in order |
| `recede` | `0.92 → 1` | Pushes back so the whole laptop is visible at hand-off |

Pass `timeline`, `poses`, or `feel` to override any of it; anything you leave out keeps the
tuned default. [`demo/src/Journey.tsx`](https://github.com/william-laverty/rigged-macbook-3d/blob/main/demo/src/Journey.tsx)
is the complete tab-bar-driven example.

## The four components

Layered so each one is useful on its own.

| Component | What it's for |
| --- | --- |
| **`<Macbook>`** | The rigged model. Headless and controlled — you drive `open`, `brightness`, and the screen content from whatever state you already have. |
| **`<MacbookStage>`** | A ready-made `<Canvas>` with the tuned camera and lighting. Skip it if you already have an R3F scene. |
| **`<MacbookLighting>`** | The three lighting presets on their own, for dropping into an existing scene. |
| **`<MacbookScroll>`** | The whole scroll journey above, in one component. |

Because `<Macbook>` is controlled, it binds to anything: a `useState`, a scroll position, a
spring, a Framer Motion value.

## API reference

<details>
<summary><b><code>&lt;Macbook&gt;</code></b> — the rigged model</summary>

<br>

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `open` | `number` | `1` | Lid amount: 0 = closed, 1 = fully open. Linear — apply your own easing. |
| `screen` | `ScreenInput` | — | Single screen content (sugar for `screens={[screen]}`). |
| `screens` | `ScreenInput[]` | — | Screen playlist; crossfade between entries with `screenIndex`/`screenMix`. |
| `screenIndex` | `number` | `0` | Active playlist entry. |
| `screenMix` | `number` | `0` | 0–1 crossfade from `screenIndex` toward `screenIndex + 1`. Raw — apply your own easing. |
| `brightness` | `number` | `1` | Screen wake: 0 = black, 1 = full. |
| `autoPlayScreens` | `boolean` | `true` | Play/pause videos so only visible entries decode (paused while the lid is shut). |
| `modelSrc` | `string` | — | Self-hosting escape hatch — see [The model](#good-to-know) below. |
| `onLoad` | `() => void` | — | Fires once the model is rigged and ready. |
| `frameDriver` | `() => MacbookFrameState` | — | Per-frame state source, called inside the render loop. Returned fields (`open`, `brightness`, `screenIndex`, `screenMix`) override the matching props — drive the model without re-rendering React. |

A `ScreenInput` is a URL string, a `THREE.Texture`, or `{ src, type?, fallbackSrc?, label? }`.
Video vs image is sniffed from the extension unless you set `type`.

`<Macbook>` also takes every prop an R3F `<group>` takes (`position`, `rotation`, `scale`, …) and
forwards a ref to the underlying `THREE.Group`.

</details>

<details>
<summary><b><code>&lt;MacbookStage&gt;</code></b> — the canvas wrapper</summary>

<br>

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `lighting` | `LightingPreset` | `'studio-dark'` | Lighting preset for the stage. |
| `lightingIntensity` | `number` | `1` | Scales the preset's lights. |
| `pauseWhenOffscreen` | `boolean` | `true` | Park the frameloop (and the GPU) while the stage is scrolled out of view. |
| `className` / `style` | — | — | Size the wrapper div with these; defaults to 100% × 100%. |

Ships a tuned camera (z 6, fov 32) and ACES filmic tone mapping. Accepts every `<Canvas>` prop, so
you can override `camera`, `dpr`, `gl`, and the rest.

</details>

<details>
<summary><b><code>&lt;MacbookLighting&gt;</code></b> — the presets</summary>

<br>

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `preset` | `'studio-dark' \| 'studio-light' \| 'soft'` | `'studio-dark'` | `studio-dark` is the tuned Space Black look — a dark body carried by a few crisp reflections. |
| `intensity` | `number` | `1` | Scales every light in the preset. |
| `children` | `ReactNode` | — | Escape hatch: children **replace** the preset entirely. |

</details>

<details>
<summary><b><code>&lt;MacbookScroll&gt;</code></b> — the scroll journey</summary>

<br>

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `screens` | `(string \| ScreenSource)[]` | — | The walkthrough content, in order. |
| `height` | `string` | `'600vh'` | Total scroll length of the pinned journey. |
| `lighting` | `LightingPreset` | `'studio-dark'` | Lighting preset. |
| `timeline` | `Partial<Timeline>` | — | Override any journey beats. |
| `poses` | `PosesPartial` | — | Override the intro / dive / outro poses. |
| `feel` | `Partial<Feel>` | — | Tune the damped follow: smooth time, max speed, per-screen dwell, crossfade fraction. |
| `pointerParallax` | `boolean` | `true` | Cursor-follow tilt once dived in. |
| `fallback` | `ReactNode` | `null` | Rendered instead of the journey without WebGL2, or under reduced motion. |
| `modelSrc` | `string` | — | Self-hosting escape hatch. |
| `onProgress` | `(p: number) => void` | — | Fires with the smoothed 0–1 progress. |
| `onActiveScreen` | `(index: number) => void` | — | Fires when the dominant screen changes — drive tab bars and captions from this. |
| `children` | `ReactNode` | — | Overlay content, rendered inside the sticky viewport above the canvas. |

The forwarded ref exposes `scrollToScreen(index)` and a read-only `progress` getter.

</details>

<details>
<summary><b>Hooks &amp; utilities</b></summary>

<br>

| Export | What it does |
| --- | --- |
| `useCapabilityGate()` | `boolean \| null` — should this client get 3D? (WebGL2 + not reduced-motion). `null` on first render, so it's SSR-safe. |
| `useScreenTextures(sources)` | Turns URLs and textures into an index-aligned `THREE.Texture[]`, with `setPlaying`/`pauseAll` to control video decode. |
| `journeyState(...)` | The pure progress → frame-state mapping. Call it yourself to keep DOM overlays in exact sync with the 3D scene. |
| `screenAt(...)` | Where the walkthrough is at a given progress: current index, next index, raw blend. |
| `speedCapAt(...)` | Per-frame speed cap for the damped follow. |
| `ramp`, `easeInOut`, `lerp`, `clamp01`, `smoothDamp` | The math the journey is built from. |
| `DEFAULT_TIMELINE`, `DEFAULT_POSES`, `DEFAULT_FEEL`, … | The tuned defaults, plus `resolveTimeline`/`resolvePoses`/`resolveFeel` to merge over them. |

</details>

## Recipes

<details>
<summary><b>Open the lid on hover</b></summary>

<br>

```tsx
const target = useRef(0);
const now = useRef(0);

<div onPointerEnter={() => (target.current = 1)} onPointerLeave={() => (target.current = 0)}>
  <MacbookStage>
    <Macbook
      screen="/demo.mp4"
      frameDriver={() => {
        now.current += (target.current - now.current) * 0.08;
        return { open: now.current };
      }}
    />
  </MacbookStage>
</div>
```

</details>

<details>
<summary><b>Bind the lid to a Framer Motion value</b></summary>

<br>

`frameDriver` reads the value every frame, so nothing re-renders:

```tsx
const openMV = useMotionValue(0);

<Macbook screen="/demo.mp4" frameDriver={() => ({ open: openMV.get() })} />
// elsewhere: animate(openMV, 1, { type: 'spring', stiffness: 120, damping: 20 });
```

</details>

<details>
<summary><b>Rotate with the mouse</b></summary>

<br>

```tsx
const groupRef = useRef<THREE.Group>(null);

useFrame((state) => {
  if (!groupRef.current) return;
  groupRef.current.rotation.y = (state.pointer.x * Math.PI) / 8;
  groupRef.current.rotation.x = (state.pointer.y * Math.PI) / 16;
});

<group ref={groupRef}>
  <Macbook open={1} screen="/demo.mp4" />
</group>
```

</details>

<details>
<summary><b>Bring your own lighting</b></summary>

<br>

```tsx
<MacbookStage>
  <MacbookLighting>
    <ambientLight intensity={0.4} />
    <directionalLight position={[5, 8, 6]} intensity={1.2} />
  </MacbookLighting>
  <Macbook open={1} screen="/demo.mp4" />
</MacbookStage>
```

</details>

## Good to know

<details>
<summary><b>Next.js</b></summary>

<br>

Everything here is a client component. With the App Router, load the stage through `next/dynamic`
with SSR off:

```tsx
'use client';
import dynamic from 'next/dynamic';

const MacbookStage = dynamic(() => import('rigged-macbook-3d').then((m) => m.MacbookStage), { ssr: false });
```

</details>

<details>
<summary><b>The model</b></summary>

<br>

By default the GLB loads from `https://unpkg.com/rigged-macbook-3d@<version>/assets/macbook-rigged.glb`,
pinned to the version you installed so it never changes underneath you. To self-host, copy
`node_modules/rigged-macbook-3d/assets/macbook-rigged.glb` into your static assets and pass its URL
as `modelSrc`.

**No other model works.** The rig — the hinge split, the `LidPivot`/`Screen` node names, the
seat-lift math that keeps the closing screen out of the keyboard — is welded to this specific file,
and a different GLB throws. You customise through props and lighting, not by bringing your own
geometry.

Multiple `<Macbook>` instances on one page are fine: each clones the node hierarchy on mount while
geometries and materials stay shared, so extra instances are cheap.

</details>

<details>
<summary><b>Fallbacks &amp; accessibility</b></summary>

<br>

`<MacbookScroll>` gates itself on `useCapabilityGate()` — WebGL2 present, `prefers-reduced-motion`
not set. It renders a height-holding placeholder on first render (SSR-safe), then either the
journey or your `fallback`. Once it downgrades it never reverts, since remounting a 3D scene under
someone is its own kind of motion.

`<MacbookStage>` and `<Macbook>` do **not** gate themselves. Using them bare, call
`useCapabilityGate()` yourself and branch on it. Make the fallback meaningful — a screenshot, a
video, a description — not an empty div. A real share of your visitors will only ever see it.

</details>

<details>
<summary><b>Troubleshooting</b></summary>

<br>

**Screen renders black with a cross-origin video.** Every `<video>` is created with
`crossOrigin="anonymous"`, so the host must send CORS headers or the browser won't let WebGL sample
the frames — and it fails silently. Serving the video from your own origin sidesteps it.

**Model won't load / unpkg is blocked.** Self-host the GLB and pass `modelSrc` (see The model, above).

**Duplicate `three` version warnings.** Two copies of `three` in one bundle silently break
materials and textures. Run `npm ls three`, then pin a single version with `overrides` (npm) or
`resolutions` (Yarn/pnpm).

**Scroll feels rough in dev.** StrictMode's double-mounting is handled. It's usually the host page
forcing synchronous layout — reading `getBoundingClientRect`/`scrollY` in an unthrottled scroll
listener, or a `ResizeObserver` loop — on the same frame as the damped follow.

</details>

---

<div align="center">

**License [MIT](https://github.com/william-laverty/rigged-macbook-3d/blob/main/LICENSE) © William Laverty**

Model: *"MacBook Pro M3 16-inch 2024"* by [jackbaeten](https://sketchfab.com/3d-models/macbook-pro-m3-16-inch-2024-8e34fc2b303144f78490007d91ff57c4),
CC-BY 4.0, rigged and recoloured — full attribution in [CREDITS.md](https://github.com/william-laverty/rigged-macbook-3d/blob/main/CREDITS.md).

*Not affiliated with or endorsed by Apple Inc. "MacBook" is a trademark of Apple Inc., used nominatively.*

</div>
