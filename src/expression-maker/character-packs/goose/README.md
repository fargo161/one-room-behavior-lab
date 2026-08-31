# Goose character pack

Goose is canonical Expression Maker character pack #2. This directory contains only runtime metadata and reproducible validation for the reusable production asset set.

## Contents

- `manifest.json`: one immutable base, the exact five native slot definitions, 90 registered slot assets, hashes, and 18 expression compositions.
- `validation.json`: pack/manifest fingerprints and independently reproducible RGBA composite hashes for all 18 canonical expressions.
- `index.ts`: adapts the manifest into the shared character-pack registry and seeds 18 character-aware presets.
- Runtime pixels: `public/expression-maker/goose/layers/` and `public/expression-maker/goose/masks/`.

Goose's native expression slots are `LEFT_BROW`, `RIGHT_BROW`, `LEFT_EYE`, `RIGHT_EYE`, and `LOWER_FACE`. The neutral base is separate and has no slot ID.

## Deliberately excluded

The repository does not track the source-batch ZIP, licensed/watermarked references, identity reference renders, generated full-face intermediates, previews/contact sheet, prompt logs, or machine-local build records. Those inputs are not runtime dependencies and must not be added to the pack.

If an authorized source batch must be re-imported, install the pinned dependency from `scripts/expression-maker/requirements-goose-pack.txt`, then run `scripts/expression-maker/import_goose_character_pack.py` with explicit `--source` and `--repository` arguments. The importer writes no machine-local paths into the repository, stages a complete candidate pack, verifies exact recomposition, and promotes it with rollback protection.
