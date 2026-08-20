# Changelog

## 0.1.0 — 2026-08-20

Initial release: rigged MacBook model (hinge + seat-lift + screen crossfade),
lighting presets (studio-dark / studio-light / soft), MacbookStage canvas wrapper,
zero-dependency MacbookScroll journey driver, capability gate, demo app.

Multiple `<Macbook>` instances per page are supported: each instance clones the
loaded GLTF's node hierarchy on mount (geometries/materials shared across
clones), replacing the earlier one-instance-per-page limitation. The
MacbookScroll damped follow also picked up per-phase speed-cap fixes so a hard
fling still crosses every screen for at least its minimum dwell time.
