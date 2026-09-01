# Room 01 ingestion and restructure report

## Executive result

**PASS — assembler-ready structure with documented art blockers.** The four owner-approved replacement ZIPs were fully inventoried as one logical corpus, reconciled, restructured, normalized where deterministic, and prepared for final reopen/extract verification. No source ZIP, advisory repository file, or supplied script was modified or executed.

The result is intentionally not a claim that every asset is production-ready. Room plates, separated ISO elements, 48 systematic poses, and native face packages remain `PRODUCTION_CANDIDATE` where art-direction, missing-view, edge, identity, or registration gates remain. The five nonstandard special poses are assigned but routed as `REFERENCE` because of identity/proportion drift.

## Inputs and verified hashes

| Approved replacement ZIP | Files | Bytes | SHA-256 | CRC |
|---|---:|---:|---|---|
| `characters.zip` | 317 | 377,072,344 | `db60e0618bf2ca12c14457b76924eba2dfdd98577d26b300dd42e8514e59af2b` | PASS |
| `environment.zip` | 109 | 120,731,403 | `6849070209029d685e1f141bab077d9df98e55ce099632032bd9f1c587729a05` | PASS |
| `pixlr.zip` | 7 | 169,033,671 | `fb0328b89dccb6c82a54bbdc1c399303c8481aaa08eb1fd5ad2afca0a344a47f` | PASS |
| `premade assets.zip` | 582 | 6,906,622 | `a4f94840b0252ff66d9c53c1418898985d1c33e2747f1b7ee4d0d6c2b941e820` | PASS |

Owner-approved container provenance substitution is recorded. The unavailable original three container hashes were not verified and the original ZIPs were not recreated. File-level provenance uses observed ZIP, full archive-relative path, byte size, SHA-256, image measurements/format, duplicate relationships, inferred prior domain where defensible, confidence, and evidence.

## Complete source accounting

- Total outer files inventoried: **1015**.
- Characters: 317; environment: 109; Pixlr: 7; premade: 582.
- Final primary-status counts: `{"AUTHORING_SOURCE": 188, "BLOCKED_MISSING": 137, "DEPRECATED": 5, "PRODUCTION_CANDIDATE": 55, "PROVENANCE": 11, "QA_ONLY": 56, "QUARANTINE": 473, "REFERENCE": 90}`.
- Outer exact-byte duplicate groups: 34; decoded-pixel groups: 31.
- Excluded/non-payload records in the final delivery ledger: 727.
- OS metadata: four `desktop.ini` records inventoried and excluded; the two newly added root records are the container-substitution additions.

## Canonical production decisions

- Two 1448×1086 bare Room 01 plates are registered for `VIEW_ISO` and `VIEW_FP2D`. Both decode and are observed free of characters, player weapon, HUD, dialogue, crosshair, and menus.
- Five separated transparent elements are registered only for `VIEW_ISO`: three fixtures and two items. Every FP2D counterpart remains `BLOCKED_MISSING`.
- Fixture/item catalog geometry retains direct source hashes, alpha bboxes, and support intervals; manual contact/surface/footprint traces and flattened-scene room transforms carry explicit basis/confidence and are not marked runtime-authoritative. Missing occlusion anchors remain `BLOCKED_MISSING` rather than fabricated.
- 48 systematic poses are mapped as 8 families × 3 identities × 2 views; five special role poses are also assigned. Canonical filenames remove suffix ambiguity.
- Pose counts: Marcus 17, Goose 18, Emilio 18.
- Normalized systematic poses use view-specific fixed 1448×1086 canvases, preserved baselines, alpha-bounded crops, LANCZOS resampling, and full transformation records. Special poses with identity/proportion drift were not scale-normalized.

## Alpha and visual QA

- All **10/10** prompt-listed max-alpha-254 sources were independently measured and their derivatives linearly expanded to max 255 without hard thresholding.
- Each repaired derivative has white, mid-gray, black, and viewer-only checker QA evidence.
- Marcus's puffed-cheeks external export has RGB matching the canonical PXZ content but materially degraded alpha. The delivered derivative deterministically multiplies canonical content alpha by the PXZ mask alpha, expands 0–253 to 0–255, and preserves content/mask/rect evidence.
- Generated edge softness/glow, identity drift, and proportion drift remain documented; no repainting or silent identity normalization was performed.
- Delivered image decode failures: 0.

## Character size bible

- FP2D nominal normalized content height: 720 px; permitted 684–756; baseline y=1040.
- ISO nominal normalized content height: 330 px; permitted 297–363; neutral baseline y=850.
- Direct source bbox distributions and every source anchor estimate are in the pose catalog. Inferred target/baseline/head/pelvis numbers are explicitly labeled with confidence.
- Supplied validation sheets remain qualitative QA evidence and are not treated as numerical authority.

## Nodes, actions, and future-runtime contracts

- Registered evidence-backed node contracts: 8; unassigned/blocked capabilities: 4. Door transitions remain disabled/unbound because only baked closed-state art exists.
- Interaction command contracts: 24; implemented commands: 0.
- Visual action records: 51; all bindings are single-frame states, never fabricated sequences.
- Health, inventory, dialogue, and pause menu schemas/examples are editable contracts only.

## Pixlr routing

- Seven PXZ projects validate; 387 nested files, zero missing manifest references/orphans, and eight PNG-magic payloads named `.webp` are documented.
- Canonical: environment organized reference, Marcus modular body library, Marcus anatomical split-eye face project.
- Archived intermediates: four valid superseded projects.
- Goose five-slot, Marcus observed/inferred native nine-band organization, and Emilio fixed-expression coverage remain separate. No generic ten-slot chassis art is present or claimed.

## Rights, privacy, and quarantine

- Gandalf bytes excluded ledger-only; Horror City bytes excluded pending source-file repackaging authority; Streets art/license `BLOCKED_MISSING`.
- Watermarked, adult/nude, baked-checker, and unclear-rights bytes are absent from the production and reference payload.
- Raw prompt files that could expose local/private paths are not copied. Sanitized hash-only records are included.
- No machine-specific absolute path or username is intentionally emitted in package metadata.

## Validation performed

- Four approved SHA-256 matches and four ZIP CRC passes.
- 1,015 unique outer source IDs accounted; all supported source images decoded in the forensic pass.
- Seven PXZ manifests reopened and every referenced payload resolved.
- JSON parsing, schema checks, unique IDs, relative-reference checks, image decode/alpha checks, prohibited-payload checks, checksum checks, ZIP CRC reopen, and extracted path/size/hash comparison are performed by the integration validator.

## Exact unresolved blockers

- Missing native FP2D fixture/item variants.
- No deterministic pose-to-face socket bridge for Goose or Marcus; no Emilio modular face system.
- Manual cleanup/art approval for edge softness, glow, identity/proportion drift, and cross-view stylistic consistency.
- Missing occlusion masks and calibrated master Pixlr overlay.
- Missing Streets of Fight payload/license and unresolved third-party repackaging authority.

## Delivery identity

- ZIP filename: `TRAPSTAR_ROOM_01_RESTRUCTURED_ASSET_PACKAGE_V01.zip`.
- ZIP byte size and SHA-256: recorded in the detached `TRAPSTAR_ROOM_01_RESTRUCTURED_ASSET_PACKAGE_V01.DELIVERY_VERIFICATION.json` and final delivery message after the immutable ZIP is built.
- Extracted verification: the final integration step reopens the ZIP, CRC-tests it, extracts it to a clean verification directory, and compares every path, byte size, and SHA-256. The detached record contains the final result.

A ZIP cannot contain its own stable SHA-256 without changing that SHA-256. The detached record is therefore the truthful non-self-referential authority for ZIP size/hash and extracted verification.
