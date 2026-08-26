# rigged-macbook-3d — Design Spec

**Date:** 2026-08-20
**Status:** Approved design, pre-implementation
**Origin:** Open-source extraction of the 3D MacBook scroll showcase from the NOX website
(`nox-website/src/components/MacbookSection/`), designed and built by William Laverty.

## 1. What this is

A React/three.js component library providing a **genuinely rigged 3D MacBook**: a real GLB
model whose lid opens and closes on a working hinge, whose screen displays arbitrary
video/image/texture content, with hand-tuned studio lighting presets — plus an optional
zero-dependency scroll driver for a pinned scroll journey (intro pose → lid open → camera
dive → hold on the playing video → recede, handing scroll back to the page).

This is explicitly NOT another CSS-transform "MacBook scroll" image mockup. The
differentiator is the rig: consumers can animate lid angle, placement, rotation, lighting,
and screen content however they choose, in any R3F scene.

## 2. Decisions (locked)

| Decision | Choice |
|---|---|
| Shape | npm package + demo site in one repo |
| Name | npm `rigged-macbook-3d`; GitHub `williamlaverty/rigged-macbook-3d` |
| API style | Headless controlled core + optional scroll driver |
| In package | Rigged model, lighting presets, video/image screen, scroll driver |
| Demo-only (not in package) | NOX typewriter headline, icon wave strip, scroll gate/clamp, idle autoplay |
| Model | Bundled, fixed, NOT swappable for other models (rig is welded to this geometry). `modelSrc` prop exists only to self-host the same file. |
| Rigging | Pre-baked offline into the shipped GLB via gltf-transform (see §5), adapted from nox-website PR #303's proven bake pipeline |
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
  screen="/demo.mp4"               // video URL, image URL, or THREE.Texture
  brightness={1}                   // screen wake: 0 black → 1 full (default 1)
  autoPlay                         // video only decodes while visible; paused otherwise (default true)
  modelSrc={optionalSelfHostUrl}   // same file only, copied from the package
  onLoad={() => {}}
/>
```

- Standard R3F transform props (`position`, `rotation`, `scale`) pass through to the root
  group — 3D placement is plain three.js, no custom API.
- `open` maps to hinge angle between the model's CLOSED/OPEN poses with the dynamic
  seat-lift applied (see §5.3) so the closed lid never clips the keyboard.
- `screen`: a string URL (extension-sniffed video vs image, with explicit
  `{ src, type }` object form) or pre-made `THREE.Texture`.
- Video handling: a detached muted looping `<video>` element →
  `THREE.VideoTexture` (SRGB, linear filters, no mipmaps), `preload="auto"`;
  imperative play/pause so the video only decodes while visible.
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

A pinned journey with zero added dependencies: a tall wrapper div + `position: sticky`
child (no GSAP pin, no pin-spacer DOM surgery), scrollY mapped to raw progress, then the
critically-damped `smoothDamp` follow run in a rAF loop. Everything renders from the
smoothed value, so choppy wheel input becomes fluid motion and reversal is exact. The gap
between the dive's end and recede's start is the hold: the open MacBook plays its video
front and centre while the user keeps scrolling, then recedes as scroll hands off to the
rest of the page.

```tsx
<MacbookScroll
  height="500vh"                                    // pin length
  screen={{ src: '/demo.webm', fallbackSrc: '/demo.mp4' }}
  lighting="studio-dark"
  timeline={{                                       // named beats, 0–1, all optional
    deviceIn: [0, 0.24],                            // fade/rise in, intro pose
    lidOpen: [0.3, 0.58],
    dive: [0.52, 0.7],                              // overlaps lid-open tail by design
    recede: [0.86, 1],                              // 0.7–0.86 gap = the hold
  }}
  poses={{ intro: { yaw: -0.5, pitch: 0.32, scale: 0.62, y: 0.25 },   // FRAME defaults
           dive:  { yaw: 0, pitch: 0.05, scale: 1.0, y: 0.05 },
           outro: { scale: 0.68, y: 0.05 } }}
  feel={{ smoothTime: 0.45, maxSpeed: 0.5 }}         // SCROLL defaults
  pointerParallax                                    // cursor tilt after the dive (default true)
  onProgress={(p) => {}}
/>
```

- `onProgress` lets consumers sync overlays (headlines, captions) in their own DOM.
- Built-in capability gate: when the client has no WebGL2 or `prefers-reduced-motion` is
  set, the component renders its `fallback` prop (default: nothing) instead of mounting
  the 3D scene. The gate re-evaluates live but only ever downgrades. Docs explain the
  signals and show a fallback example.

### 3.5 Also exported

- `useScreenTexture(source)` — the video/image texture hook, for advanced custom scenes.
- `math`: `ramp`, `easeInOut`, `lerp`, `clamp01`, `smoothDamp` (documented — they're
  useful for consumers syncing their own DOM overlays).
- `journeyState(progress, timeline, poses)` — the pure progress → frame-state mapping so
  DOM overlays stay in lockstep with the 3D scene.
- All TypeScript types.

## 4. What is deliberately NOT in the package

- Scroll gate / scroll clamping (`clampScroll`) — scroll-jacking is site-specific polish.
- Idle autoplay through the journey.
- Typewriter headline, iMessage bubble, platform icon wave — NOX-branded; the wave may
  become a future optional extra if requested.
- 2D fallback component — the `fallback` prop + docs cover degradation; shipping a styled
  2D MacBook image component drags in brand-specific assets.

## 5. Model & rig

### 5.1 Source model

"MacBook Pro M3 16-inch 2024" by jackbaeten (Sketchfab), CC-BY 4.0, as already edited for
NOX (Draco-compressed GLB, ~624 KB, 19 fused meshes). Kept in the repo as
`assets/macbook-source.glb` so the bake is reproducible; only the baked output ships to
npm. Attribution required and provided (§8).

### 5.2 Pre-baked rig (offline, `scripts/rig-model.mjs`)

One-time Node script (kept in repo, documented), **adapted from nox-website PR #303's
`scripts/bake-macbook-rig.mjs`** — a gltf-transform (NodeIO) pipeline that edits the glTF
document directly (no lossy three.js GLTFExporter round-trip). Dev deps:
`@gltf-transform/core|extensions|functions`, `meshoptimizer`, `draco3d`.

1. Read the Draco-compressed source GLB (draco3d registered as decoder); dispose the
   `KHR_draco_mesh_compression` extension after read.
2. Recolour light aluminium materials to Space Black `[0.05, 0.05, 0.06]`: for each
   non-screen material without a baseColorTexture, if linear lightness
   `(max+min)/2 > 0.22` → Space Black baseColorFactor, `metallic 1.0`, `roughness 0.5`,
   and tag `extras.spaceBlack` (envMapIntensity isn't expressible in glTF — runtime
   applies `0.85` from `userData`). Normal maps kept.
3. Snapshot all mesh nodes + world matrices before mutating; clone meshes instanced by
   multiple nodes; `transformMesh(mesh, worldMatrix)` to bake transforms (safely clones
   shared vertex streams).
4. Split lid vs base triangles per primitive by union-find connected components
   classified by centroid against the hinge plane (constants: `HINGE_Y -0.5`,
   `HINGE_Z -12.2`, normal `(0, 0, -1)`); shared shells get a cloned primitive with the
   lid indices.
5. Rebuild the scene: `Base` node + `LidPivot` (at hinge) → `LidHolder` (offset-cancel)
   → `Lid` + single-primitive `Screen` node (single-primitive so three's GLTFLoader
   yields a Mesh named after the node). **Hard-fail** if no lid triangles or ≠1 screen
   primitive.
6. Record rig constants in `asset.extras` so the GLB is self-describing (seat-lift
   `SCREEN_BOTTOM {Y:1.25, Z:-13.2}`, `SEAT_TARGET_Y 0.7`, lid angles `OPEN_X 0` /
   `CLOSED_X 1.94`, fit info) plus the CC-BY attribution.
7. Optimise: `dedup()`, `prune()`, `compactPrimitive()` per primitive (drops vertices
   stranded by the index split), then `weld()` + `meshopt({level: 'high'})` →
   `assets/macbook-rigged.glb`. A `BAKE_COMPRESS=draco` escape hatch is kept.

**Why meshopt over Draco for the output:** meshopt is larger raw (~942 KB vs 624 KB) but
smaller gzipped (~512 KB vs 525 KB, and CDNs serve compressed), decodes faster, and —
decisive for a library — drei's `useGLTF` enables the meshopt decoder by default, so
consumers need zero decoder config (Draco would drag a runtime WASM decoder fetch into
every consuming app).

**Verification gate:** render baked vs original side-by-side (Playwright screenshots);
materials, normals, and hinge motion must match before the baked GLB is committed.

### 5.3 Runtime responsibilities

Mirrors PR #303's slimmed runtime component: the load path only wires up what glTF can't
carry.

- Load GLB (drei `useGLTF`), locate `LidPivot` / `Screen` by name; throw a clear,
  actionable error if missing (wrong/foreign model). Apply `envMapIntensity 0.85` to
  materials tagged `spaceBlack` in `userData`. Wiring cached on `gltf.userData` so
  remounts don't re-process.
- Lid: `rotation.x = CLOSED_X + (OPEN_X − CLOSED_X) · easeInOut(open)` is the consumer's
  responsibility to ease — the component maps `open` linearly; easing guidance in docs.
- Dynamic seat-lift each frame: hold the screen's bottom edge at `SEAT_TARGET_Y` whenever
  bare rotation would drop it lower (exact port of the NOX math).
- Screen: swap in `MeshBasicMaterial` (toneMapped false); `brightness` drives
  `screenMat.color.setScalar`.

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
│   ├── useScreenTexture.ts
│   ├── math.ts
│   └── constants.ts
├── assets/
│   ├── macbook-source.glb     # Draco source (repo only, not published)
│   └── macbook-rigged.glb     # baked meshopt output (published)
├── scripts/rig-model.mjs      # gltf-transform bake (adapted from nox-website PR #303)
├── demo/                      # Vite + React, not published to npm
│   ├── src/ (journey page + playground page with sliders)
│   └── public/ (NOX demo videos)
├── docs/specs/               # this document
├── tests/ (vitest: math, journey, timeline resolution)
├── README.md  CREDITS.md  LICENSE  llms.txt  CHANGELOG.md
├── package.json  tsup.config.ts
```

## 7. Build, test, publish

- **Build:** tsup → ESM + CJS + d.ts; `"use client"` banner (Next.js App Router safe);
  `sideEffects: false`; `files: ["dist", "assets/macbook-rigged.glb", "README.md",
  "CREDITS.md", "LICENSE"]` (the Draco source GLB stays repo-only).
- **Peers:** `react >= 18`, `three >= 0.160`, `@react-three/fiber >= 8`.
  `@react-three/drei` regular dependency.
- **Tests:** vitest units for `math.ts`, `journeyState`, and timeline resolution.
  Visual: demo screenshots via the local Playwright workflow before publish.
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
