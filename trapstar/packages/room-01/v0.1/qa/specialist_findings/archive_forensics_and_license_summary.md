> Integration note: this is a preserved specialist-stage QA report. Its draft/no-promotion wording describes the specialist's bounded scratch phase; the root package manifests and final status taxonomy govern delivery.

# Forensics and License Summary

Generated: `2026-09-01T20:31:15+00:00`

## Scope and safety

The four approved ZIPs were treated as one read-only logical corpus. No supplied scripts or binaries were executed, no source archive was modified, and no asset was extracted into a production tree. All identifiers below are sanitized source-relative identifiers.

The inventory accounts for **1,015 / 1,015 outer files**. Accounting complete: **true**.

| Source ZIP | Outer files | Archive bytes | SHA-256 |
|---|---:|---:|---|
| `characters.zip` | 317 | 377,072,344 | `db60e0618bf2ca12c14457b76924eba2dfdd98577d26b300dd42e8514e59af2b` |
| `environment.zip` | 109 | 120,731,403 | `6849070209029d685e1f141bab077d9df98e55ce099632032bd9f1c587729a05` |
| `pixlr.zip` | 7 | 169,033,671 | `fb0328b89dccb6c82a54bbdc1c399303c8481aaa08eb1fd5ad2afca0a344a47f` |
| `premade assets.zip` | 582 | 6,906,622 | `a4f94840b0252ff66d9c53c1418898985d1c33e2747f1b7ee4d0d6c2b941e820` |

Both added root OS metadata files are inventoried and excluded: `characters.zip::characters/desktop.ini` and `environment.zip::environment/desktop.ini`. The two Horror City `desktop.ini` files are excluded as well.

## Provenance and duplicates

- Unique outer byte hashes: **881**.
- Exact-byte duplicate groups: **34**, representing **134** redundant copies and **36,733,821** redundant bytes.
- Decoded-pixel duplicate groups: **31**; **8** contain differing file bytes with the same decoded pixel sequence.
- C2PA-bearing outer images detected: **84**. Provenance markers are recorded but are not treated as distribution licenses.
- Inferred prior archive/domain claims are confidence-scored and grounded in exact hashes, source-relative naming, or the Marcus/PXZ topology cross-check. Unsupported repository claims are not elevated to source authority.

## PXZ validation and canonical routing

All **7** PXZ projects were opened as data containers. They contain **387** nested files. Missing manifest references: **0**. Orphan media: **0**.

There are **8** nested extension/magic mismatches: the layer masks use `.webp` names but contain PNG payloads. Projects with mismatches: `pixlr.zip::pixlr/trap body.pxz` (1), `pixlr.zip::pixlr/trap_body_modular_library_upscaled_organized.pxz` (1), `pixlr.zip::pixlr/trap_body_top_row_individual_layers.pxz` (1), `pixlr.zip::pixlr/trapface.pxz` (2), `pixlr.zip::pixlr/trapface_slot_labeled_anatomical_eye_split.pxz` (1), `pixlr.zip::pixlr/trapface_slot_labeled_specific.pxz` (2).

Reused document identity: `6ae30292-b0ff-4137-b121-6d9e981923c1` across 3 projects. The three body project variants therefore require an explicit future canonical-ID mapping rather than import-by-document-ID.

Marcus routing is supported by a complete 62-row name/order/geometry match between `characters.zip::characters/marcus/expression_marcus/layer_manifest.csv` and `pixlr.zip::pixlr/trapface_slot_labeled_anatomical_eye_split.pxz`. The PXZ itself remains generically named `Untitled`; identity comes from the derivative characters path/CSV.

The external Marcus `10_FULL_FACE_PUFFED_CHEEKS_01.png` is not canonical: its RGB is identical to the PXZ content, but its alpha is materially reduced. The correct content PNG, separate mask, and manifest rectangle remain recoverable from the PXZ without rebuilding. A corrected flattened export was not created.

## Rights routing and exclusions

- Excluded or quarantined assets: **584**.
- Every GandalfHardcore asset is represented only as exclusion-ledger metadata; no asset byte is copied, derived, previewed, published, or production-routed. Three packs' embedded license permits game/project use and modification but prohibits redistribution/repackaging, AI training, NFTs, game-development-tool use, and print; Character Effects supplies no pack-specific license.
- Horror City bytes remain reference-only and outside distributable production. Preserve attribution to Darby Machin and obtain an authoritative complete license before any redistribution.
- The `__MACOSX/Streets of Fight files` tree consists of AppleDouble metadata. Actual counterparts—including the purported public license—are absent; nothing in that tree is production-routable.
- Adult/sensitive review labels occur on **202** records. This includes **40** explicit `nude` filenames and **3** known mixed-content containers. These are additive quarantine/no-preview labels only: Gandalf remains `EXCLUDE_LEDGER_ONLY`, so no quarantined copy or preview derivative is retained. The known 128px Female preview contains explicit pixel-art nudity.
- Characters, environment, and Pixlr sources have no archive-level distribution license. They remain on rights/provenance hold even when technically usable.

## Technical readiness

- The Pixlr scene projects are valid editable containers, but the environment views are flattened alternatives rather than separable production props/tiles.
- Characters and environment include concept, generated, validation, and derivative material. File presence does not prove production standards such as pivot, baseline, canvas, or chassis compatibility.
- Premade pixel-art packs and realistic Pixlr assets are stylistically and resolution-wise incompatible without deliberate conversion.
- Extension-only routing is unsafe because AppleDouble sidecars masquerade as image/project/PDF names and PXZ masks masquerade as WebP.

## Deliverables

- `source_inventory.json`
- `archive_summary.json`
- `duplicate_map.json`
- `pxz_validation.json`
- `license_asset_ledger.json`
- `excluded_asset_ledger.json`

Every JSON file was parsed and cross-validated after generation.
