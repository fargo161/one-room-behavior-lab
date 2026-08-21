# Trapstar Quick Scene Maker v0.1

## Implemented

- Responsive single-page Apt. 305 visual editor.
- Exactly three actor slots with character, pose, zone, visibility, depth, and reset controls.
- ISO/2D switching that preserves character identity, pose ID, and semantic zone.
- Six authored zones with per-view anchors and bounded local offsets.
- Direct canvas selection and bounded pointer dragging.
- Bare/furnished compatible background filtering and deterministic layer ordering.
- Five data-driven visual staging presets.
- Valid-manifest pose, blocking, and combined randomization.
- Canonical versioned `SceneState` JSON download and defensive JSON loading.
- Native-resolution PNG composition export without editor chrome.
- `APT_305_QUICK_SCENE` fixture and focused acceptance tests.
- Renderer inputs remain plain scene state plus an asset manifest; no social inference or simulation state is introduced.

## Asset compatibility

- Backgrounds: Apt. 305 ISO bare/furnished presentation and 2D bare room.
- Characters: Contact, Broker, and Tracksuit.
- Poses: eight per character per view, 48 total.
- Pose families: idle, arms crossed, open hand, pointing, back facing, phone/listening, leaning, and hands on hips.
- Embedded phone state is surfaced in slot metadata.
- Runtime paths are normalized independently of display labels.
- Legacy root-level character sprites are excluded from the compatibility manifest.
- ISO deal-table and couch overlays are available in the furnished presentation.
- No source visual identities were replaced or regenerated during editor integration.

## Known limitations

- The supplied library contains only one native 2D background, so the furnished alternate is ISO-only.
- Furniture occlusion uses explicit depth and simple overlays; there is no automatic mask generation.
- Runtime `<img>` elements are intentional because export requires exact native sprite pixels; lint reports three advisory image-optimization warnings.
- Assets remain `GENERATED_RECONSTRUCTION` and can vary slightly between pose families.

## Validation

- Scene Maker focused tests: 9 passed.
- Full repository tests: 257 passed across 17 files.
- Type checking: passed.
- Lint: passed with zero errors and three advisory `<img>` warnings.
- Production build: passed.
- Browser acceptance: three actors render; ISO/2D preserves cast and zones; casting, pose, background, visibility, depth, bounded drag, fixture load, JSON save, and PNG export passed.
