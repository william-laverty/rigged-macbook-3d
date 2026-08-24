# Changelog

## 0.1.1 — 2026-08-24

Documentation-only release. No source changes: the public API and the bundled
model are identical to 0.1.0. The one build difference is `DEFAULT_MODEL_URL`,
which is pinned to the package version and so now resolves to the 0.1.1 asset.

Rewrote the README around the hero image and a short pitch, with the API
reference, recipes and troubleshooting moved into collapsible sections — the
same content, but 529 visible words instead of 2,325. Refreshed the package
description to match.

## 0.1.0 — 2026-08-20

Initial release: rigged MacBook model (hinge + seat-lift + screen crossfade),
lighting presets (studio-dark / studio-light / soft), MacbookStage canvas wrapper,
zero-dependency MacbookScroll journey driver, capability gate, demo app.

Multiple `<Macbook>` instances per page are supported: each instance clones the
loaded GLTF's node hierarchy on mount (geometries/materials shared across
clones), replacing the earlier one-instance-per-page limitation. The
MacbookScroll damped follow also picked up per-phase speed-cap fixes so a hard
fling still crosses every screen for at least its minimum dwell time.
