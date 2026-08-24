# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`rigged-macbook-3d` — a published npm package (v0.1.0) shipping a headless React/three.js
component for a genuinely rigged 3D MacBook, plus a Vite demo in `demo/` deployed to Vercel.
The repo is both the library and its showcase; only `dist/`, `assets/macbook-rigged.glb`,
`README.md`, `CREDITS.md` and `LICENSE` are published (see `files` in package.json).

## Commands

```bash
npm test                              # vitest run (4 files, pure-logic units)
npx vitest run tests/journey.test.ts  # single file
npx vitest run -t "speedCapAt"        # single test/describe by name
npx vitest                            # watch mode
npm run typecheck                     # tsc --noEmit over src + tests
npm run build                         # tsup → dist/ (ESM + CJS + d.ts)
npm run bake                          # re-rig assets/macbook-source.glb → assets/macbook-rigged.glb
npm run build:demo                    # build lib, install demo deps, build demo (Vercel's build command)
```

Demo dev loop:

```bash
npm run build && npm --prefix demo run dev
```

`demo/package.json` depends on `rigged-macbook-3d: "file:.."`, which symlinks to the repo root
and resolves through `package.json` `exports` → **`dist/`**. Editing `src/` does nothing in the
demo until you re-run `npm run build`. `demo/vite.config.ts` dedupes `react`/`three`/fiber/drei
because the linked package would otherwise pull a second copy of each.

## Architecture

Four layers, each independently useful and each depending only on the ones below it:

1. **Pure logic** (`math.ts`, `screenAt.ts`, `journey.ts`, `constants.ts`, `types.ts`) — no React,
   no three.js. `journeyState(p, timeline, poses, count, crossfadeFraction)` is the single
   deterministic mapping from 0–1 scroll progress to a whole frame's worth of state
   (`deviceIn`, `open`, `brightness`, `pose`, `screenIndex`, `screenMix`). The 3D scene, the DOM
   overlay, and any consumer all call it and therefore agree by construction. **This layer is the
   only one under test** — `tests/` is node-environment vitest with no DOM or WebGL harness.
2. **Hooks** (`useScreenTextures.ts`, `useCapabilityGate.ts`) — video/image/Texture → `THREE.Texture`
   with imperative play/pause, and the WebGL2 + `prefers-reduced-motion` gate (returns `null` on
   first render for SSR safety, and only ever downgrades).
3. **`<Macbook>`** — the headless controlled core. Renders exactly what its props describe inside
   any R3F canvas.
4. **Wrappers** — `<MacbookLighting>` (presets), `<MacbookStage>` (`<Canvas>` + camera + tone
   mapping + `IntersectionObserver` frameloop parking), `<MacbookScroll>` (the full pinned journey:
   sticky viewport + rAF loop + critically-damped follow, no scroll library).

### State flows through refs, not renders

The animation path deliberately avoids React re-renders. `MacbookScroll` keeps progress, pointer,
resolved config, and consumer callbacks in refs (`progressRef`, `pointerRef`, `configRef`,
`callbacksRef`), reassigning `.current` on every render. The rAF effect depends only on `capable`,
so inline object props (`timeline`/`poses`/`feel`) and parent re-renders (commonly triggered by the
consumer's own `onActiveScreen` → `setState`) can't tear down the loop, reset velocity, or re-prime
progress mid-scroll. `Macbook`'s `frameDriver` prop is the same idea exposed publicly: a function
called inside `useFrame` whose returned fields override the matching props each frame.

**When adding a tuning knob or callback to `MacbookScroll`, put it in `configRef`/`callbacksRef`
rather than in the effect's dependency array.**

### The model is welded to the rig

`rigModel()` in `Macbook.tsx` looks up nodes `LidPivot` and `Screen` by name and throws with a
pointed error if either is missing. `modelSrc` exists only to self-host *this* GLB — other models
are not supported, by design (see the spec's locked decisions).

Two non-obvious details in there, both load-bearing:

- **Per-instance clone, and deliberately not `useMemo`.** `useGLTF` hands every caller the same
  cached scene, but an `Object3D` can only have one parent, so each `<Macbook>` deep-clones it.
  `rigModel` is not idempotent (each call mints fresh screen materials), and StrictMode
  double-invokes memo factories while discarding one result — which would leave the frame loop
  driving materials that aren't on the mounted mesh (permanently black screen). It uses a
  `useRef` + identity check instead.
- **Seat lift.** The hinge sits below the keycaps, so a bare rotation sinks the closed screen into
  the keyboard. Each frame the runtime computes the screen's bottom edge from the hinge angle and
  raises `pivot.position.y` just enough to hold it at `targetY`.

### Rig constants have one source of truth

Hinge geometry is authored **only** in `scripts/rig-model.mjs` (`HINGE_Y`, `HINGE_Z`, lid open/closed
angles, screen-bottom, seat target) and baked into the `LidPivot` node's glTF `extras`. The runtime
reads them back off the loaded node; `LID`/`SEAT` in `src/constants.ts` are fallbacks only. Change
hinge values in the bake script and re-bake — don't edit the runtime constants to compensate.

The bake also does the Space-Black recolour, splits lid from base by **connected component**
(union-find on shared vertices, classified by centroid — this traces the real hinge seam instead of
slicing through geometry with a plane), isolates the screen primitive, and meshopt-compresses. It
throws if the split yields no lid, if no primitive uses the screen material, or if the screen mesh
isn't exactly one primitive.

**After `npm run bake`, copy the output to the demo:**
`cp assets/macbook-rigged.glb demo/public/macbook-rigged.glb` — both files are committed and must
stay byte-identical (the demo passes `modelSrc="/macbook-rigged.glb"` to avoid the CDN).

### Default model URL is version-pinned

`DEFAULT_MODEL_URL` is `https://unpkg.com/rigged-macbook-3d@${__PKG_VERSION__}/assets/macbook-rigged.glb`,
with `__PKG_VERSION__` injected by tsup's `define` from `package.json`. Bumping the version means
the default URL points at a version that doesn't resolve until that version is published to npm.

## Conventions

- **No runtime dependencies, ever.** `react`, `react-dom`, `three`, `@react-three/fiber` and
  `@react-three/drei` are all peers; everything else is dev-only or bake-time-only. No GSAP, no
  Lenis — the scroll journey is hand-rolled specifically to avoid them.
- Every exported symbol and prop carries JSDoc; the README prop tables and `llms.txt` are generated
  by hand from it. **Changing a public prop means updating `src/`, `README.md`, `llms.txt`, and
  `CHANGELOG.md` together** — `llms.txt` is a self-contained API spec for AI agents and drifts
  silently otherwise.
- tsup prepends a `"use client"` banner to the whole bundle (Next.js App Router).
- Comments in this codebase explain *why* a non-obvious thing is done (StrictMode, `needsUpdate`
  on `.map` swaps, video decode pausing). Match that density rather than narrating what the code does.
- Commits: `feat:`/`fix:`/`docs:`/`chore:`/`test:`, staging specific paths (never `git add .`).

## Reference docs

`docs/specs/2026-08-20-rigged-macbook-3d-design.md` holds the locked design decisions, including
what is deliberately *not* in the package (scroll clamping, idle autoplay, a 2D fallback component,
the tab bar — that one lives in `demo/src/TabBar.tsx` as copy-paste example code).
`docs/plans/2026-08-20-rigged-macbook-3d.md` is the completed build plan.
