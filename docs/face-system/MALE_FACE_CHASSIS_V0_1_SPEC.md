# Male Face Chassis v0.1 — repaired public contract

## Reality and authority

This release is a **designed schema checkpoint**. It defines public semantics, geometry, identity-pack requirements, and deterministic selection behavior. It does not claim that generic raster art, masks, gaze sprites, seams, or visual parity have been implemented or visually validated.

The executable authority is `src/face-chassis/v0_1/schema.ts`, parsed against `contract.json`. The checked JSON Schema files are structural envelopes only; their `x-authoritative-validator` fields point back to the Zod validators that enforce cross-record invariants.

The public contract is normative. Marcus source pixels are identity-bound evidence and cannot redefine the contract or be reused directly as generic runtime art.

## Face-space

- Canvas: `1187 × 1484` pixels.
- Origin: top-left; +x is image-right and +y is down.
- Rectangles: half-open pixel-edge bounds `[x, x+width) × [y, y+height)`.
- Anchors: pixel-center coordinates normalized by `x / 1186` and `y / 1483`, tolerance `1e-9`.
- Source transform: subtract `(1019, 499)` from the `3264 × 2448` PXZ document coordinates.
- Sides are anatomical in an unmirrored front view: anatomical left appears on image-right. Display mirroring does not rename stored sides.

## Slots and deterministic order

| Slot | Role | Side | Slot rect `(x,y,w,h)` | z |
|---|---|---:|---:|---:|
| `BASE_HEAD` | base | — | `0,0,1187,1484` | 0 |
| `MIDFACE` | raster replacement | — | `330,460,527,430` | 10 |
| `LOWER_FACE` | raster replacement | — | `330,650,527,500` | 20 |
| `EYE_R` | raster replacement | right | `280,356,382,343` | 30 |
| `EYE_L` | raster replacement | left | `525,356,382,343` | 31 |
| `GAZE_R` | transform overlay | right | `280,356,382,343` | 40 |
| `GAZE_L` | transform overlay | left | `525,356,382,343` | 41 |
| `BROW_R` | raster replacement | right | `244,229,631,448` | 50 |
| `BROW_L` | raster replacement | left | `312,229,631,448` | 51 |
| `MACRO_OVERRIDE` | macro | — | `0,0,1187,1484` | 100 |

Draw order is the table order above. Ordinary slots have exactly one selected state. The macro has zero or one selected state. Unknown states and missing renderable assets are rejected.

`BASE_HEAD` must be a coherent neutral underpaint, including declared replacement fields. Validation rejects a composition with a missing renderable asset before any replacement field is cleared or drawn; the underpaint supports atomic masked replacement, not an automatic missing-asset fallback. Replacement-region rectangles are bounding/clear-mask envelopes and may overlap. Future asset masks—not rectangle intersection alone—define painted coverage and seam ownership. The only permitted ordinary painted-feature overlaps are each eye under its corresponding gaze aperture.

Replacement ownership is closed: `BROW_L_FIELD` and `BROW_R_FIELD` use anatomical-midline clip ownership; `EYE_L_FIELD` and `EYE_R_FIELD` use masked replacement; `GAZE_L_APERTURE` and `GAZE_R_APERTURE` use eye-aperture clips; `MIDFACE_FIELD` and `LOWER_FACE_FIELD` use masked replacement; `MACRO_FACE_FIELD` uses macro replacement. Every region falls back to the coherent `BASE_HEAD` underpaint and resolves to exactly one primary owner.

## Anchor contract

Thirty anchor IDs are frozen: five central references (`FACE_CENTER`, `FOREHEAD_CENTER`, `NOSE_BRIDGE_CENTER`, `NOSE_TIP`, `CHIN_CENTER`); seven left brow/eye/pupil anchors and seven right equivalents; two nostrils; two cheek references; five mouth/lip anchors; and two jaw references. Their exact pixel and normalized values live in `contract.json`. IDs, anatomical meaning, order, mirror relationships, and per-slot required-anchor lists are stable. An identity-pack raster attachment must equal the canonical global anchor minus that slot's origin; per-state offsets cannot redefine it.

## Frozen state catalog

- Base: `NEUTRAL`.
- Each brow: `NEUTRAL`, `LOW_FLAT`, `LOW_HEAVY`, `FURROW_CENTER_DEEP`, `ANGRY_ARCHED`, `ARCHED_TALL`.
- Each eye: `OPEN_NEUTRAL`, `HALF_LID`, `SQUINT_TIGHT`, `WIDE_OPEN_ALERT`, `CLOSED_TIGHT`.
- Each gaze: `CENTER`, `LOOK_ANATOMICAL_LEFT`, `LOOK_ANATOMICAL_RIGHT`, `LOOK_UP`, `LOOK_DOWN`.
- Midface: `NEUTRAL`, `CHEEK_RAISE`, `NOSE_SCRUNCH`, `MIDFACE_TENSION`.
- Lower face: `NEUTRAL_CLOSED`, `SMILE_CLOSED`, `SMILE_TEETH`, `FROWN_POUT`, `FROWN_TENSE`, `MOUTH_OPEN_SMALL`, `MOUTH_OPEN_SOFT`, `SHOUT_OPEN`, `LAUGH_WIDE_OPEN`, `GRIMACE_FEAR`.
- Macro: `PUFFED_CHEEKS`.

`SHUT_TIGHT` is not an alias and is not in the v0.1 catalog. Its two Marcus layers remain reference-only. `CLOSED_TIGHT` is canonical.

## Gaze and compatibility

Gaze is a transform rig, not five baked directional eye rasters. Anatomical-left has positive x in the unmirrored front-view coordinate system; anatomical-right has negative x; up has negative y; down has positive y. Both sides use identical frozen v0.1 transform magnitudes and pupil scales.

When an eye is `CLOSED_TIGHT`, its requested gaze is preserved for diagnostics but omitted from the effective render plan. Under `SQUINT_TIGHT`, the canonical normalized gaze offset is multiplied by `0.35`.

## Macro behavior

`PUFFED_CHEEKS` suppresses, in frozen order, `BROW_L`, `BROW_R`, `EYE_L`, `EYE_R`, `GAZE_L`, `GAZE_R`, `MIDFACE`, and `LOWER_FACE`; it allows none of them. Requested ordinary selections remain available for diagnostics. The base renders first and the macro renders last at precedence 1000.

## Identity-pack boundary

An identity pack has a globally unique asset registry and an exact binding for all 48 public slot/state pairs. Unbound extras are permitted only when explicitly `REFERENCE_ONLY`. The generated schema-first generic descriptor contains exactly 38 raster descriptors and two side-local gaze-rig descriptors. Every generated descriptor is `DESIGNED`, has null pixel paths, and is not validated.

Reality is split across independent axes:

- implementation: `DESIGNED | PLACEHOLDER | IMPLEMENTED`;
- automated test: `NOT_RUN | PASSED | FAILED`;
- visual validation: `NOT_REVIEWED | PASSED | FAILED | NOT_APPLICABLE`.

An asset is derived as validated only when it is `IMPLEMENTED`, automated tests are `PASSED`, and visual validation is `PASSED`. A visual pass cannot be asserted for designed or placeholder content.

Raster canvases exactly match slot dimensions and have local origin `(0,0)`; per-state positional offsets are forbidden. Non-base replacement assets require explicit masks once pixels exist. Gaze rigs require side-correct neutral anchors, aperture masks, sprites, and positive maximum pixel offsets only when implemented or placeholder pixels exist. Maximum travel must fit within half the frozen aperture envelope. The renderable planner resolves every selected asset, rejects `DESIGNED`/missing paths, converts normalized travel to pixels, and carries the aperture clip mask into the render plan.

## Verification surface

- Executable contract: `src/face-chassis/v0_1/schema.ts`
- Deterministic semantic and manifest-aware renderable planners: `src/face-chassis/v0_1/runtime.ts`
- Identity-pack validator: `src/face-chassis/v0_1/identityPack.ts`
- Contract instance: `src/face-chassis/v0_1/contract.json`
- Structural envelopes: `schemas/male-face-chassis-v0.1.schema.json` and `schemas/male-face-chassis-identity-pack-v0.1.schema.json`
- Mutation tests: `src/face-chassis/v0_1/schema.test.ts`
- Schema-artifact drift tests: `src/face-chassis/v0_1/schemaArtifacts.test.ts`

Art authoring, seam review, expression parity, and identity-independence visual review are the next phase and are intentionally outside this checkpoint.
