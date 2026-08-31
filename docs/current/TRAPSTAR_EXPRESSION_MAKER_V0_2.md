# Trapstar Multi-Character Expression Maker v0.2

## Purpose

Expression Maker is one desktop-first browser workbench for assembling, ordering, saving, reopening, and exporting identity-bound facial expressions. Marcus is canonical character pack #1 and Goose is canonical character pack #2. The application is available at `/expression-maker`.

The shared runtime owns layer ordering, transforms, rendering, persistence, import/export, groups, and PNG export. Each character pack owns its identity, native slot vocabulary, registered assets, canonical presets, and reset composition.

## Character-pack boundary

Source metadata and adapters live under:

- `src/expression-maker/character-packs/marcus/`
- `src/expression-maker/character-packs/goose/`

Runtime pixels remain at stable character-scoped URLs:

- `public/expression-maker/marcus/{layers,masks}/`
- `public/expression-maker/goose/{layers,masks}/`

The registry at `src/expression-maker/character-packs/registry.ts` is the application boundary. Application code resolves an asset using both `characterPackId` and `assetId`; an ID from one character can never silently resolve against another pack.

## Native slots

Marcus retains its original nine-slot model unchanged: `BASE_HEAD`, `BROW_L`, `BROW_R`, `EYE_L`, `EYE_R`, `GAZE_L`, `GAZE_R`, `LOWER_FACE`, and `MACRO_OVERRIDE`.

Goose declares exactly five expression slots: `LEFT_BROW`, `RIGHT_BROW`, `LEFT_EYE`, `RIGHT_EYE`, and `LOWER_FACE`. Goose's immutable neutral base is a separate `BASE` asset with `slotId: null`; it is not a sixth expression slot and is not mapped to a Marcus-specific name.

Both packs use canonical `1187 × 1484` face space and back-to-front preset layer arrays. Goose slot layers are stored as losslessly cropped registered PNGs. Their `faceRect` restores the crop to its absolute face-space position and makes translation, scale, and rotation pivot around the local feature instead of the full canvas.

## Marcus authority

Marcus remains pinned to `trapface_slot_labeled_anatomical_eye_split.pxz`, SHA-256 `D184F0512A11E8B3D92278E5A089AAEB16BDA20CC3A9A6CA6C87A94E84183CE7`. Its 62 stable layer IDs, visibility, lock state, registration, classifications, source hashes, and optional macro mask remain unchanged. The manifest moved to `src/expression-maker/character-packs/marcus/manifest.json`; public asset URLs did not move.

To rebuild Marcus assets from the separately held source:

```powershell
python scripts/expression-maker/extract_marcus_pxz.py "<marcus-source.pxz>"
```

## Goose authority

Goose contains one neutral base, 90 registered slot layers (18 expressions × five slots), and five slot masks. The repository does not retain the source reference sheet, watermarked/licensed imagery, generated full-face intermediates, previews, contact sheet, or machine-local prompt/build records.

`src/expression-maker/character-packs/goose/manifest.json` hashes every retained runtime asset and describes the five native slot rectangles. `validation.json` records the pack fingerprint and pixel-exact composite SHA-256 for all 18 expressions. The source-batch ZIP is a delivery artifact and must remain outside Git.

To promote a separately held validated Goose source batch:

```powershell
python -m pip install -r scripts/expression-maker/requirements-goose-pack.txt
python scripts/expression-maker/import_goose_character_pack.py --source "<goose-expression-batch>" --repository "."
```

The pinned Pillow version keeps output compression and hashes reproducible. The importer stores no source path, stages only reusable production pixels, clears RGB only under fully transparent pixels, crops every slot to its registered rectangle, recomputes hashes, and rejects any expression that no longer exactly recomposes. The live public pack is promoted only after the full candidate validates, with rollback protection for the existing pack and metadata.

## Library schema v2

The library schema is `trapstar-expression-library`, version 2. It contains an `assetSources[]` entry for each installed character pack. Every group and preset requires `characterPackId`; a preset may reference only a group from the same character pack. Layers keep stable asset IDs and do not duplicate the pack ID because their containing preset supplies that scope.

The browser key is `trapstar-expression-maker:library:v2`. On load/import, a valid Marcus v1 library is migrated deterministically: its groups, presets, layer arrays, IDs, transforms, and timestamps are preserved, all Marcus records gain `characterPackId: "marcus"`, and the canonical Goose seed is added. The legacy `trapstar-expression-maker:marcus:library:v1` value is read but never deleted or overwritten. Serialization always emits v2.

PNG filenames begin with the character-pack ID. Library export downloads `trapstar-expression-library-v2.json`.

## Rendering guarantees

Live preview and PNG export call the same character-aware compositor. Canvas dimensions, asset lookup, masks, missing-asset warnings, and cache keys are pack-scoped. The preset `layers[]` array is the only render-order authority. Missing asset references are preserved and reported with their character name.

## Limitations

- Persistence is local browser storage, not accounts or cloud sync.
- Painted blend regions can show seams in arbitrary combinations.
- The workbench supports translation, uniform scale, and rotation only.
- No mesh deformation, animation, lip sync, rigging, AI generation, gameplay integration, or backend is included.
