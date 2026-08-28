# Male Face Chassis v0.1 — schema contradiction audit

**Audit date:** 2026-08-28
**Decision:** **SCHEMA CHECKPOINT APPROVED; FULL ART/SEAM AUDIT DEFERRED**

## Scope and instruction boundary

The attached audit prompt, implementation prompt, PXZ, derivative ZIP, and preflight response were ingested as specification inputs and evidence. The user's direct request governed execution: first ingest and confirm, then proceed only after the explicit `proceed`. That authorization covered the repaired schema-first pass and its validation artifacts, not extensive generic art authoring.

This decision applies only to the public schema, identity-pack contract, deterministic selection behavior, and source-evidence mapping. It is not a visual-quality pass and does not claim that generic pixels exist.

## Contradictions found and repairs applied

| Topic | Contradiction or ambiguity | Frozen repair |
|---|---|---|
| Canonical canvas | Source document is `3264×2448`, while the face/base evidence is `1187×1484` | Public face-space is `1187×1484`; source coordinates transform by `(-1019,-499)` |
| Base fallback | Replacement slots could imply cleared holes under missing overlays | `BASE_HEAD` must be a coherent neutral underpaint beneath declared replacement fields |
| Side labels | Screen-side and anatomical-side interpretations could invert `_L/_R` | Sides are anatomical; left appears image-right in an unmirrored front view |
| Gaze | Source has baked `SIDE_LOOK` composites while the task requires reusable gaze | Five canonical gaze semantics are transforms over two side-local rigs; baked side-look layers are reference-only |
| Closed-eye naming | `CLOSED_TIGHT` and standalone `SHUT_TIGHT` could become aliases | `CLOSED_TIGHT` is canonical; `SHUT_TIGHT` is reference-only and absent from the catalog |
| Macro coexistence | `PUFFED_CHEEKS` did not have a closed-world suppression partition | It suppresses all eight ordinary slots, allows none, preserves requested intent, and renders last |
| Geometry overlap | Replacement bounding rectangles overlap although only eye→gaze painted overlap is allowed | Rectangles are explicitly bounding/clear-mask envelopes; eventual asset masks define painted coverage and seams |
| Status claims | Implementation, automated testing, and visual review could be conflated into one “validated” flag | Three independent status axes; validated is derived only from implemented + automated pass + visual pass |
| Asset bindings | A state-name catalog alone could not prove identity-pack completeness or global uniqueness | Concrete `assets[]` and `bindings[]` validators enforce 48 exact bindings, global IDs, canvas/mask/anchor/provenance/status rules; the generated designed pack has 40 descriptors and only explicit reference-only extras may be unbound |
| Source reuse | A Marcus semantic exemplar could be mistaken for generic runtime art | Every one of 62 source layers explicitly prohibits direct generic reuse |
| JSON Schema authority | Generated JSON Schema cannot encode Zod `superRefine` cross-record rules | JSON files are labeled structural envelopes and point to the authoritative executable validators |

## Current contradiction status

No blocking contradiction remains in the schema checkpoint. Mutation tests prove rejection of wrong roles/order/sides, exact region/anchor/gaze drift, region ownership, gaze signs/parity, macro partitions/order, anchor closure, duplicate/dangling asset IDs, incorrect canvases, invented designed paths/travel, false visual passes, and reference-only runtime bindings. Manifest-aware planning rejects designed-only assets and consumes gaze travel/aperture data for renderable packs.

The sole retained warning is an exact three-row visibility mismatch in the non-authoritative derivative ZIP CSV. The authoritative PXZ, checked source inventory, and schema all agree on the governing evidence.

## Deferred gates

The following remain deliberately unassessed until art exists:

- neutral-base coherence under actual alpha masks;
- replacement-mask seam quality and forbidden painted overlap;
- authored identity independence and absence of hair/facial-hair/jewelry/clothing contamination;
- gaze sprite/aperture travel limits and occlusion quality;
- macro visual precedence;
- expression parity and visual validation across all states.

Until those gates are completed, the overall chassis must not be described as production-validated.
