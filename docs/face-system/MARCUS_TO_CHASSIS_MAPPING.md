# Marcus-to-chassis reference mapping

## Evidence boundary

The authoritative source is `trapface_slot_labeled_anatomical_eye_split.pxz`, SHA-256 `D184F0512A11E8B3D92278E5A089AAEB16BDA20CC3A9A6CA6C87A94E84183CE7`. It contains a `3264 × 2448` document, 62 layers, and the locked visible base rect `(1019,499,1187,1484)`.

The companion ZIP is non-authoritative. Its SHA-256 is `FB65AF146631BE0518D4AD36A7BD9438C31D444DED6D9A23A3A574E4407097CF`.

All 62 layers are inventoried in `artifacts/male_face_chassis_v0_1/reference/marcus/marcus_layer_mapping.csv`. Direct generic reuse is prohibited for every row.

## Disposition totals

| Disposition | Count | Meaning |
|---|---:|---|
| `reference_only` | 11 | Evidence retained, never a direct generic binding |
| `semantic_exemplar` | 33 | Primary evidence for a canonical semantic concept |
| `semantic_alternate` | 10 | Additional evidence for the same canonical concept |
| `future_variant` | 8 | Brow candidates outside the frozen v0.1 catalog |

## Resolved decisions

- Anatomical `LEFT` maps to `_L` slots and appears on image-right in the unmirrored front view.
- `CLOSED_TIGHT` maps to the canonical closed-eye state.
- Both standalone `SHUT_TIGHT` layers are `reference_only`; they do not alias `CLOSED_TIGHT` and do not create a v0.1 runtime state.
- Eight baked `SIDE_LOOK` layers are `reference_only`, because their direction is not proven and v0.1 gaze is transform-driven.
- `FURROW_ANGLED` and `FURROW_OUTER_WRINKLE` remain eight `future_variant` candidates outside the frozen brow catalog.
- `NEUTRAL_WRINKLED` is low-confidence semantic evidence for canonical brow `NEUTRAL`; its pixels remain identity-bound.
- The puffed-cheeks content plus its separate WebP mask is semantic evidence for `MACRO_OVERRIDE / PUFFED_CHEEKS`.

## Non-authoritative export warning

The ZIP CSV says `visible=false` while the PXZ says `visible=true` for exactly:

- `60_EYE_LEFT_SIDE_LOOK_02`
- `65_EYE_RIGHT_SIDE_LOOK_04`
- `70_LOWER_FACE_SMILE_CLOSED_03`

This is a warning, not a schema blocker, because the PXZ is authoritative. Any additional mismatch fails the validator.

## Reproduction

Run `scripts/face-chassis/validate_marcus_reference.py` against the two supplied files. It verifies hashes, archive paths, entry/resource counts, PNG dimensions, source geometry, anatomical image-side and paired placement, classification totals, the checked CSV, and the exact derivative warning set. The validator is read-only. Expected result is `PASS_WITH_WARNINGS`.
