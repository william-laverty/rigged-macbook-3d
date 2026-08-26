# Changelog

## 0.2.0 — 2026-08-26

Reworked screen and scroll API (breaking). The screen shows a single video (or
image): `<Macbook screen>` takes one `ScreenInput`, with `autoPlay` (default
true) pausing the video while the lid is shut or the screen is dark, and
`useScreenTexture` turning any `ScreenInput` into a ready `THREE.Texture`.

Retuned scroll journey: `<MacbookScroll screen>` takes the video that plays once
the lid opens, and the timeline beats are `deviceIn` → `lidOpen` → `dive` →
`recede`, with two deliberate rests — the gap before `recede` holds on the open,
playing MacBook while the user keeps scrolling, and the tail after it settles
the pushed-back device for a beat before scroll hands off to the rest of the
page. The damped follow adapts to input velocity — slow scrolls track closely,
flicks absorb into one continuous glide, and a hard fling is capped at a
cinematic pace. Default `height` is now `'600vh'`.

## 0.1.1 — 2026-08-24

Documentation-only release. No source changes: the public API and the bundled
model are identical to 0.1.0. The one build difference is `DEFAULT_MODEL_URL`,
which is pinned to the package version and so now resolves to the 0.1.1 asset.

Rewrote the README around the hero image and a short pitch, with the API
reference, recipes and troubleshooting moved into collapsible sections — the
same content, but 516 visible words instead of 2,325. The package description
now matches the repository's.

## 0.1.0 — 2026-08-20

Initial release: rigged MacBook model (hinge + seat-lift + video screen),
lighting presets (studio-dark / studio-light / soft), MacbookStage canvas wrapper,
zero-dependency MacbookScroll journey driver, capability gate, demo app.

Multiple `<Macbook>` instances per page are supported: each instance clones the
loaded GLTF's node hierarchy on mount (geometries/materials shared across
clones), replacing the earlier one-instance-per-page limitation.
