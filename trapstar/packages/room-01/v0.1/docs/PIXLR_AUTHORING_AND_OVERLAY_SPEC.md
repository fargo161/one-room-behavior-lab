# Pixlr authoring and overlay specification

No new master assembler PXZ was built. The validated source PXZs are preserved byte-exactly, and this document defines a future master without altering hidden layers, layer order, visibility, blends, rectangles, or IDs.

## Canonical existing projects

- `environment_base_clean_organized_v01.pxz`: nine flattened full-scene visual-reference/storyboard layers; not a movable-element room build.
- `trap_body_modular_library_upscaled_organized.pxz`: Marcus body pose-fragment library; not a complete anatomical rig.
- `trapface_slot_labeled_anatomical_eye_split.pxz`: Marcus canonical native face authoring project with cropped, overlapping patches.

The other four valid PXZ files are retained under `archived_intermediates/`. All seven reopen as ZIP/PXZ containers, all manifest media references resolve, and eight internal files named `.webp` carry PNG magic; this mismatch is documented rather than rewritten.

## Future master layer contract

```text
GUIDES                              [visible while authoring; excluded from art export]
    CANVAS_SAFE_AREA
    CHARACTER_SCALE
    FLOOR_BASELINE
    DEPTH_ZONES
    CHARACTER_SPACES
    ITEM_SPACES
    NODE_HOTSPOTS

VIEW__FP2D
    ROOM_PLATE
    FIXTURES
    ITEMS
    CHARACTERS
    EFFECTS
    NODE_OVERLAYS
    UI_SAFE_AREA

VIEW__ISO
    ROOM_PLATE
    FIXTURES
    ITEMS
    CHARACTERS
    EFFECTS
    NODE_OVERLAYS
    UI_SAFE_AREA
```

Use stable manifest IDs as layer names or prefixes. Each exported view frame is 1448×1086. Group visibility selects one view; guides and node overlays are non-exportable. Resolve depth primarily by foot baseline, then explicit occluder overrides. No occluder masks were supplied, so that layer remains a blocked authoring task.

## Face compatibility boundary

- Goose: native 1187×1484 base plus five full-canvas slots, anatomical left/right, 18 expressions. Structural recomposition passes, but seam/lighting compromises and pose attachment keep the pack at `PRODUCTION_CANDIDATE`.
- Marcus: observed/inferred nine numeric layer bands (`00`, `10`, `20`, `30`, `40`, `50`, `60`, `65`, `70`). No explicit nine-slot machine-readable contract was found. The puffed-cheeks override was deterministically recovered from canonical PXZ content+mask; its degraded export remains evidence.
- Emilio: fixed expression only; no modular face package found.
- Generic ten-slot chassis: not present in the uploaded assets and not claimed.

Bridge mappings may be authored later, but they must not force these identity-specific contracts into one topology. Pixlr layer IDs should map explicitly to `room_id`, `view_id`, `element_id`, `node_id`, `character_id`, and `pose_id` fields in the package manifests.
