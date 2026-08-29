# Trapstar Expression Maker v0.1

## Purpose

Expression Maker is a desktop-first browser workbench for assembling, ordering, saving, reopening, and exporting Marcus facial expressions. It is deliberately separate from gameplay, the generic male-face chassis runtime, animation, rigging, and the wider character system.

The tool is available at `/expression-maker`.

## Marcus source authority

The only v0.1 art source is `trapface_slot_labeled_anatomical_eye_split.pxz`, SHA-256 `D184F0512A11E8B3D92278E5A089AAEB16BDA20CC3A9A6CA6C87A94E84183CE7`.

- Raw Pixlr document: `3264 × 2448`.
- Canonical face-space: `1187 × 1484`.
- Source offset: `(1019,499)`.
- Face-space position: `(x_document - 1019, y_document - 499)`.
- Anatomical left appears on image-right in the unmirrored front view.
- All 62 content PNGs retain their source bytes and native cropped resolution.

The runtime manifest is `src/expression-maker/assets/marcus_asset_manifest.json`. Runtime art is served from `public/expression-maker/marcus/`.

Slot and semantic classification are pinned by the tracked Marcus mapping, SHA-256 `320917B3526DFCF20164F99B3BEED38CD1320491AF366CC5CE3CEB8D498C3F8C`. The manifest records that mapping path and hash alongside the PXZ provenance.

## Asset manifest

Every asset records:

- the exact PXZ layer name as its stable `id`;
- frozen Marcus slot ID;
- source stack index and numeric band;
- original content-resource name and SHA-256;
- document-space and canonical face-space rectangles;
- source visibility, lock, opacity, side, and semantic evidence;
- content URL and optional mask definition;
- explicit `MARCUS_ONLY` identity binding.

Asset IDs are not array indices and must not be renamed, slugged, deduplicated, or collapsed by semantic state. Human-readable labels are separate.

The frozen slots are `BASE_HEAD`, `BROW_L`, `BROW_R`, `EYE_L`, `EYE_R`, `GAZE_L`, `GAZE_R`, `LOWER_FACE`, and `MACRO_OVERRIDE`. This PXZ supplies no `MIDFACE` asset.

## Preset and group format

An expression layer references one stable `assetId` and stores visibility, lock state, X/Y registration offset, uniform scale, and rotation. X/Y values are corrections relative to the source asset's registered canonical position.

An expression preset stores its ID, name, optional group ID, timestamps, and an ordered `layers[]` array. Groups store stable IDs and editable names.

> Layer ordering is expression-specific and is saved with each preset.

The first element of `layers[]` is rendered at the back and the last at the front. The generic face-chassis draw order and source numeric bands never override a preset. The route opens the real `Suspicious 02` acceptance fixture; **Reset to PXZ visible state** reconstructs the four source-visible layers in their exact source order.

## Rendering and PNG export

Live preview and PNG export both call the same `1187 × 1484` canvas compositor. It draws only visible, resolvable layers in preset array order and applies each transform around the registered asset center. Preview work is staged offscreen and committed only if it is still the newest render, so rapid edits cannot interleave stale pixels. The canvas is cleared to transparency; the checkerboard is editor CSS and is never exported.

`10_FULL_FACE_PUFFED_CHEEKS_01` has one external mask. Its source name is `fa41b4d648f0.webp`, but the bytes are PNG. Extraction publishes the same bytes with a `.png` runtime path. The compositor applies its alpha in an asset-local offscreen canvas before drawing the macro as one layer.

Missing asset references remain in preset data. The compositor flags them, skips only the unresolved layer, and continues rendering the rest. Known-image load failures report both stable asset ID and runtime path.

## Persistence and interchange

Saved groups and presets are stored locally under `trapstar-expression-maker:marcus:library:v1`. The data is device-local by explicit v0.1 design.

Export Library downloads a versioned JSON document containing the Marcus source fingerprint, groups, presets, and referenced asset IDs. Import validates the entire document before replacing current data. Malformed or incompatible JSON is rejected atomically. Structurally valid missing asset references are retained and reported.

## Adding Marcus assets

Run:

```powershell
python scripts/expression-maker/extract_marcus_pxz.py "C:\path\to\trapface_slot_labeled_anatomical_eye_split.pxz"
```

The extractor refuses a source whose SHA, canvas, layer count, tracked mapping hash/evidence, resource format, slot count, or registration differs from the pinned authority. It validates every source layer before writing, stages an exact 62-layer/one-mask runtime tree, atomically swaps that tree, removes stale runtime files by replacement, and commits the manifest last with rollback protection. Identical reruns do not rewrite correct outputs.

A genuinely new source requires a deliberate source/version migration and reviewed stable IDs. Do not rename existing assets or silently reuse another character's art.

## v0.1 limitations

- Persistence is local browser storage, not accounts or cloud sync.
- Assets contain broad painted blend regions; arbitrary cross-pose combinations can show seams or doubled detail.
- `SIDE_LOOK_01..04` are baked eye/gaze assets with unresolved direction labels.
- `SHUT_TIGHT`, `CLOSED_TIGHT`, and `SQUINT_TIGHT` remain separate source variants.
- The workbench supports simple translation, uniform scale, and rotation only.
- No mesh deformation, animation, lip sync, rigging, AI generation, game integration, or backend is included.
