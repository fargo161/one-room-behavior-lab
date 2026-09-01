> Integration note: this is a preserved specialist-stage QA report. Its draft/no-promotion wording describes the specialist's bounded scratch phase; the root package manifests and final status taxonomy govern delivery.

# Character Visual QA

Scope: 48 systematic pose PNGs, five special pose PNGs, six neutral validation JPGs, Goose facial slots, Marcus face exports, and relevant Pixlr documents. Supplied scripts were not executed.

## Corpus mapping and readiness

| Suffix | Character | View | Readiness |
|---|---|---|---|
| none | Goose / Tracksuit | 2D/front set | Provisional; normalize canvas and anchors |
| (2) | Marcus / Broker | 2D/front set | Provisional; normalize canvas and anchors |
| (3) | Emilio / Contact | 2D/front set | Provisional; no modular face package |
| (4) | Goose / Tracksuit | ISO three-quarter | Provisional; perspective/identity drift; hands-on-hips cleanup required |
| (5) | Marcus / Broker | ISO three-quarter | Provisional; open-hand negotiating cleanup required |
| (6) | Emilio / Contact | ISO three-quarter | Provisional; no modular face package |

The three source sheets directly establish that mapping. The “2D” label is a set label: phone/listening and leaning remain profile/three-quarter actions, and back-facing is rear.

**PXZ body identity correction:** direct inspection of `pixlr/trap_body_modular_library_upscaled_organized.pxz` identifies the depicted body as Marcus/Broker with high confidence—not Goose. The nested thumbnail and full-body layers match Marcus’s swept-back hair, facial hair, black leather suit, gold patterned shirt, and brown dress shoes; they do not match Goose’s blue tracksuit and white sneakers. Catalog wording should call it the **Marcus/Broker modular body working-source candidate**, not an approved runtime-canonical rig.

## Direct visual defects

- Marcus ISO `open_hand_negotiating (5)` has conspicuous white/gray speckle around the body, arm/hand, and feet on the gray validation tile.
- Goose ISO `hands_on_hips (4)` has a ragged noisy halo, most visible around the legs, feet, and screen-right edge.
- Several other ISO composites show lesser bright edge outlines; the 2D rows are generally cleaner.
- ISO assets are independent generated renderings rather than rotations: head/body proportion, stance, foreshortening, and apparent scale drift.
- Back views validate clothing/hair silhouette only; they cannot validate facial identity.

## Five specials

All five are RGBA and composite cleanly, but their canvas/centering differs from the systematic corpus. Four top out at alpha 254 and one at 255; this is not itself a visible defect. They are **reference-only** because they are absent from the source and validation sheets and show identity/costume-detail drift—strongest between the two Goose specials and noticeable between the two Emilio specials.

## Face QA

- Goose: five direct slots on 1187×1484—LEFT_BROW, RIGHT_BROW, LEFT_EYE, RIGHT_EYE, LOWER_FACE—across 18 expressions/90 registered slot PNGs. The supplied validation manifest reports 0 pixels changed from neutral for expression 09, so it is effectively redundant.
- Goose expression 08 (puffed cheeks) and expression 10 show boundary contamination requiring cleanup; the puffed-cheeks raw output lacks usable alpha, while the registered LOWER_FACE slot is recoverable.
- Marcus: 62 manifest rows and nine observed numeric bands. The exported puffed-cheeks layer has only 146163 nonzero-alpha pixels, max alpha 147, and bbox 72,268,509,403; it is too faint/broken. The matching internal PXZ content has 385278 nonzero-alpha pixels, max alpha 253, and a 615×818 bbox plus a retained mask, so it is recoverable by re-export.
- Marcus “nine-band” is directly supported as numeric organization, not nine independent anatomy slots; 40/60 both serve left-eye content and 50/65 both serve right-eye content.
- Neither Goose nor Marcus frontal face system is validated as a three-quarter/profile replacement package. Emilio has no observed modular face package.

## Validation-sheet interpretation

The six 1600×1100 RGB JPEGs are qualitative white/black/gray `ALPHA + EDGE CHECK` composites. They support fringe detection only. They do **not** support measured size standards: no rulers, original dimensions, ground line, pivot, common bounding box, or scale declaration is present.

## Blockers before production-ready status

- Approve a runtime canvas, body height, baseline, pivot, and head/body seam transform.
- Correct the two severe ISO edge defects and run all sprites over white/black/mid-gray/checkerboard at 100% zoom.
- Re-export Marcus puffed cheeks from the retained PXZ content+mask and verify straight-alpha behavior.
- Author or approve ISO/profile face packages; create an Emilio identity-specific face package if swaps are required.
- Resolve identity drift in the five specials before admitting them to the normalized pose set.
- Review the watermarked expression-reference JPEG and its embedded copyright metadata before downstream reuse.
