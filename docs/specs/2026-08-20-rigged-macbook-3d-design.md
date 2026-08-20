# rigged-macbook-3d — Design Spec

**Date:** 2026-08-20
**Status:** Approved design, pre-implementation
**Origin:** Open-source extraction of the 3D MacBook scroll showcase from the NOX website
(`nox-website/src/components/MacbookSection/`), designed and built by William Laverty.

## 1. What this is

A React/three.js component library providing a **genuinely rigged 3D MacBook**: a real GLB
model whose lid opens and closes on a working hinge, whose screen displays arbitrary
video/image/texture content with built-in crossfading, with hand-tuned studio lighting
presets — plus an optional zero-dependency scroll driver that recreates the NOX homepage's
pinned scroll journey (intro pose → lid open → camera dive → screen walkthrough → recede).

This is explicitly NOT another CSS-transform "MacBook scroll" image mockup. The
differentiator is the rig: consumers can animate lid angle, placement, rotation, lighting,
and screen content however they choose, in any R3F scene.

## 2. Decisions (locked)

| Decision | Choice |
|---|---|
| Shape | npm package + demo site in one repo |
| Name | npm `rigged-macbook-3d`; GitHub `williamlaverty/rigged-macbook-3d` |
| API style | Headless controlled core + optional scroll driver |
| In package | Rigged model, lighting presets, screen crossfade playlist, scroll driver |
| Demo-only (not in package) | Tab bar (as example code), NOX typewriter headline, icon wave strip, scroll gate/clamp, idle autoplay |
| Model | Bundled, fixed, NOT swappable for other models (rig is welded to this geometry). `modelSrc` prop exists only to self-host the same file. |
| Rigging | Pre-baked offline into the shipped GLB (see §5); runtime rig kept as documented fallback if export fidelity fails |
| Dependencies | `three`, `@react-three/fiber` (peers), `@react-three/drei` (dep). No GSAP, no Lenis. |
| License | MIT (code); model CC-BY 4.0 (jackbaeten) with attribution |
| Publish | v0.1.0 to npm as part of this work |
| Demo screen content | NOX product demo videos |
| Demo hosting | Vite app in `demo/`, deployed to Vercel, linked from README |

## 3. Package API

Four exports, layered so each is useful alone.

### 3.1 `<Macbook>` — headless rigged model (core)

An R3F component; requires an ancestor `<Canvas>` (any existing scene, or `<MacbookStage>`).

```tsx
<Macbook
  open={0.8}                       // 0 = closed, 1 = fully open (default 1)
  screen="/demo.mp4"               // single source: video URL, image URL, or THREE.Texture
  screens={[srcA, srcB, srcC]}     // OR playlist for crossfade
  screenIndex={1}                  // active playlist entry (default 0)
  screenMix={0.3}                  // 0–1 crossfade toward screenIndex+1 (default 0)
  brightness={1}                   // screen wake: 0 black → 1 full (default 1)
  autoPlayScreens                  // videos: only visible entries decode; rest paused (default true)
  modelSrc={optionalSelfHostUrl}   // same file only, copied from the package
  onLoad={() => {}}
/>
```

- Standard R3F transform props (`position`, `rotation`, `scale`) pass through to the root
  group — 3D placement is plain three.js, no custom API.
- `open` maps to hinge angle between the model's CLOSED/OPEN poses with the dynamic
  seat-lift applied (see §5.3) so the closed lid never clips the keyboard.
- `screen`/`screens` entries: string URLs (extension-sniffed video vs image, with explicit
  `{ src, type }` object form) or pre-made `THREE.Texture`.
- Crossfade uses the coplanar overlay-mesh technique from the NOX implementation
  (`overMat.opacity = mix`, `polygonOffset`, `depthWrite: false`, `renderOrder 2`).
- Video handling ports `useScreenVideos`: detached muted looping `<video>` elements →
  `THREE.VideoTexture` (SRGB, linear filters, no mipmaps), first entry `preload="auto"`,
  rest `metadata`; imperative play/pause so only on-screen entries decode.
- Model is normalised (recentered, fit to a known world size ~4.2 units) so consumer
  scale/position math is predictable and documented.

### 3.2 `<MacbookLighting>` — presets

```tsx
<MacbookLighting preset="studio-dark" intensity={1} />
```

- `"studio-dark"` (default): the NOX rig verbatim — low ambient, warm key directional,
  cool fill + back-rim, and the dark-studio `<Environment>` with Lightformer bands
  (warm key softbox, cool rim band, twin front streaks, dim base, side reflectors).
  This contrast is what sells Space-Black anodised aluminium.
- `"studio-light"`: brighter environment for light-background pages.
- `"soft"`: gentle even lighting, minimal drama.
- `intensity` scales the whole rig. Children replace the rig entirely for full custom.

### 3.3 `<MacbookStage>` — canvas convenience wrapper

```tsx
<MacbookStage lighting="studio-dark" className="...">
  <Macbook open={t} screen="/demo.mp4" />
</MacbookStage>
```

Sets up `<Canvas>` with camera `[0,0,6]` fov 32, `dpr [1,2]`, alpha, ACES filmic tone
mapping, and the chosen lighting preset. Forwards extra `<Canvas>` props. `frameloop`
management: pauses when off-screen via IntersectionObserver (prop-disableable).

### 3.4 `<MacbookScroll>` — optional scroll journey driver

Recreates the NOX pinned journey with zero added dependencies: a tall wrapper div +
`position: sticky` child (no GSAP pin, no pin-spacer DOM surgery), scrollY mapped to raw
progress, then the critically-damped `smoothDamp` follow with per-phase speed caps run in
a rAF loop. Everything renders from the smoothed value, so choppy wheel input becomes
fluid motion and reversal is exact.

```tsx
<MacbookScroll
  height="600vh"                                    // pin length
  screens={[{ src: '/inbox.webm', fallbackSrc: '/inbox.mp4', label: 'Inbox' }, …]}
  lighting="studio-dark"
  timeline={{                                       // named beats, 0–1, all optional
    deviceIn: [0, 0.25],                            // fade/rise in, intro pose
    lidOpen: [0.45, 0.62],
    dive: [0.58, 0.73],                             // overlaps lid-open tail by design
    screens: [0.73, 0.92],                          // walkthrough band (crossfades inside)
    recede: [0.92, 1],
  }}
  poses={{ intro: { yaw: -0.5, pitch: 0.32, scale: 0.62, y: 0.25 },   // FRAME defaults
           dive:  { yaw: 0, pitch: 0.05, scale: 1.0, y: 0.05 },
           outro: { scale: 0.68, y: 0.05 } }}
  feel={{ smoothTime: 0.33, maxSpeed: 0.42,          // SCROLL defaults
          screenMinSeconds: 0.6, crossfadeFraction: 0.4 }}
  pointerParallax                                    // cursor tilt after the dive (default true)
  onProgress={(p) => {}}
  onActiveScreen={(i) => {}}                         // for consumer-built tab bars etc.
/>
```

- Default timeline/pose/feel values are the NOX-tuned constants from `data.ts`.
- `onActiveScreen`/`onProgress` let consumers build overlays (tab bars, headlines) in
  their own DOM; the demo shows a complete tab-bar example.
- Built-in capability gate: when the client has no WebGL2 or `prefers-reduced-motion` is
  set, the component renders its `fallback` prop (default: nothing) instead of mounting
  the 3D scene. The gate re-evaluates live but only ever downgrades. Docs explain the
  signals and show a fallback example.

### 3.5 Also exported

- `useScreenTextures(sources)` — the video/image texture hook, for advanced custom scenes.
- `math`: `ramp`, `easeInOut`, `lerp`, `clamp01`, `smoothDamp` (documented — they're
  useful for consumers syncing their own DOM overlays).
- `screenAt(progress, count, band, crossfadeFraction)` — the walkthrough mapping
  (generalised `demoAt`) so DOM overlays stay in lockstep with the 3D crossfade.
- All TypeScript types.

## 4. What is deliberately NOT in the package

- Scroll gate / scroll clamping (`clampScroll`) — scroll-jacking is site-specific polish.
- Idle autoplay through the walkthrough.
- Typewriter headline, iMessage bubble, platform icon wave — NOX-branded; the wave may
  become a future optional extra if requested.
- Tab bar — demo example code instead (it's plain DOM driven by `onActiveScreen`).
- 2D fallback component — the `fallback` prop + docs cover degradation; shipping a styled
  2D MacBook image component drags in brand-specific assets.

## 5. Model & rig

### 5.1 Source model

"MacBook Pro M3 16-inch 2024" by jackbaeten (Sketchfab), CC-BY 4.0, as already edited for
NOX (639 KB GLB, 19 fused meshes). Attribution required and provided (§8).

### 5.2 Pre-baked rig (offline, `scripts/rig-model.mjs`)

One-time Node script (kept in repo, documented) porting the proven runtime rig from
`MacbookModel.tsx`:

1. Recolour light aluminium materials to Space Black `[0.05, 0.05, 0.06]`
   (skip screen material + textured/dark materials; `metalness 1.0`, `roughness 0.5`,
   `envMapIntensity 0.85`; normal maps kept).
2. Bake each mesh's world transform into geometry; split lid vs base triangles by
   union-find connected components classified by centroid against the hinge plane
   (constants: `HINGE_Y -0.5`, `HINGE_Z -12.2`, normal `(0, 0, -1)`).
3. Reparent lid geometry under `LidPivot` group at the hinge axis (with the offset-
   cancelling holder); name nodes `LidPivot`, `Screen`, `Base` for runtime lookup.
4. Recenter + record fit scale in `asset.extras` (plus seat-lift constants
   `SCREEN_BOTTOM {Y:1.25, Z:-13.2}`, `SEAT_TARGET_Y 0.7`, lid angles
   `OPEN_X 0` / `CLOSED_X 1.94` — runtime reads these, no magic numbers in code).
5. Export `assets/macbook-rigged.glb` via GLTFExporter.

**Verification gate:** render baked vs original side-by-side (Playwright screenshots);
materials, normals, and hinge motion must match. If export fidelity fails, fall back to
shipping the original GLB + the runtime rig (same code, run at load, cached on
`gltf.userData`).

### 5.3 Runtime responsibilities

- Load GLB (drei `useGLTF`), locate `LidPivot` / `Screen` by name; throw a clear,
  actionable error if missing (wrong/foreign model).
- Lid: `rotation.x = CLOSED_X + (OPEN_X − CLOSED_X) · easeInOut(open)` is the consumer's
  responsibility to ease — the component maps `open` linearly; easing guidance in docs.
- Dynamic seat-lift each frame: hold the screen's bottom edge at `SEAT_TARGET_Y` whenever
  bare rotation would drop it lower (exact port of the NOX math).
- Screen: swap in `MeshBasicMaterial` (toneMapped false) + coplanar overlay for crossfade;
  `brightness` drives `baseMat.color.setScalar`.

### 5.4 Asset delivery

- GLB ships in the npm package under `assets/`.
- Default `modelSrc`: versioned CDN URL
  `https://unpkg.com/rigged-macbook-3d@<pkg.version>/assets/macbook-rigged.glb`
  (version injected at build). Zero config in all bundlers/frameworks.
- Self-hosting: copy the file from `node_modules/rigged-macbook-3d/assets/` to your public
  dir and pass `modelSrc`. Docs state plainly that no other model works.

## 6. Repo layout

```
rigged-macbook-3d/
├── src/
│   ├── index.ts
│   ├── Macbook.tsx
│   ├── MacbookLighting.tsx
│   ├── MacbookStage.tsx
│   ├── MacbookScroll.tsx
│   ├── useScreenTextures.ts
│   ├── math.ts
│   └── constants.ts
├── assets/macbook-rigged.glb
├── scripts/rig-model.mjs
├── demo/                      # Vite + React, not published to npm
│   ├── src/ (journey page + playground page with sliders)
│   └── public/ (NOX demo videos)
├── docs/specs/               # this document
├── tests/ (vitest: math, screenAt, prop mapping)
├── README.md  CREDITS.md  LICENSE  llms.txt  CHANGELOG.md
├── package.json  tsup.config.ts
```

## 7. Build, test, publish

- **Build:** tsup → ESM + CJS + d.ts; `"use client"` banner (Next.js App Router safe);
  `sideEffects: false`; `files: ["dist", "assets", "README.md", "CREDITS.md", "LICENSE"]`.
- **Peers:** `react >= 18`, `three >= 0.160`, `@react-three/fiber >= 8`.
  `@react-three/drei` regular dependency.
- **Tests:** vitest units for `math.ts`, `screenAt`, timeline resolution, and prop→state
  mapping. Visual: demo screenshots via the local Playwright workflow before publish.
- **Demo deploy:** Vercel (separate project), README links to it.
- **Publish flow:** build → tests → visually verify demo (local GLB path) → create GitHub
  repo + push → `npm publish` v0.1.0 (verify npm login first) → verify CDN GLB URL
  resolves → switch demo to published package (or keep workspace link) → deploy demo.

## 8. Licensing & attribution

- `LICENSE`: MIT (William Laverty) — covers all code.
- `CREDITS.md`: model by jackbaeten, CC-BY 4.0, link to source + license; note William's
  rig/material modifications; attribution also embedded in GLB `asset.extras` and README.
- README trademark note: not affiliated with Apple; "MacBook" is an Apple trademark,
  depicted nominatively.

## 9. Documentation (human + AI agents)

- **README.md:** hero media, 2-line quickstart, install, full prop-table API reference for
  all four components, recipes (open on hover, mouse-rotate, Framer Motion binding, full
  scroll journey, custom lighting), SSR/Next.js notes (dynamic import, `ssr: false`),
  degradation guidance (WebGL2 probe, reduced motion, touch), troubleshooting.
- **llms.txt:** compact self-contained API spec + canonical snippets so AI agents can
  integrate without crawling source.
- **JSDoc** on every exported symbol and prop.
- Demo source written as copy-paste-grade example code.

## 10. Success criteria

1. `npm i rigged-macbook-3d` + the 2-line `<MacbookStage>` snippet renders the lit,
   openable MacBook with a video screen in a fresh Vite or Next.js app.
2. The demo's scroll journey is visually faithful to the NOX homepage section (minus
   NOX-branded overlays).
3. No GSAP/Lenis in the dependency tree; package installs clean with React 18 and 19.
4. An AI agent given only README + llms.txt can produce a working integration.
5. v0.1.0 live on npm; CDN model URL resolves; demo deployed.
