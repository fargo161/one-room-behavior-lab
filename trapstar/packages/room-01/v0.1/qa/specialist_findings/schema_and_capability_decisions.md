> Integration note: this is a preserved specialist-stage QA report. Its draft/no-promotion wording describes the specialist's bounded scratch phase; the root package manifests and final status taxonomy govern delivery.

# Room 01 schema and capability decisions

## Scope

These drafts define editable data contracts for a later assembler/runtime. They do not implement behavior, fabricate missing images, or convert still poses into animation sequences.

The four owner-approved category ZIPs are treated as one logical source corpus. Container substitution affects provenance bookkeeping, not the semantic contracts. Paths accepted by these schemas are package-relative or source-relative; machine-specific absolute paths are not part of the contracts.

## Namespace boundaries

- `interaction_command_id` is the point-and-click command namespace from the restructuring brief.
- `living_comic_function` is a separate advisory compatibility namespace containing `ESCAPE`, `ATTENTION`, `ACCESS`, and `SENSORY`.
- `semantic_action` expresses narrative or gameplay intent.
- `visual_action_id` identifies an evidence-backed visual state. It is nullable when the supplied corpus has no supported art.
- No namespace is implicitly converted into another.

## Runtime truthfulness

- Every entry in `function_catalog_draft.json` has `implemented: false`.
- Every entry in `action_catalog_draft.json` has `implemented: false`.
- Existing still poses are modeled as `SINGLE_FRAME_ONLY`; start, loop, hold, and end arrays remain empty until exact canonical pose IDs are integrated. Empty arrays do not claim a sequence.
- `ENTER`, `EXIT`, `TAKE_ITEM`, `GIVE_ITEM`, `USE_FIXTURE`, `TALK`, and `THREATEN` remain visually unbound because the source corpus does not directly support them.
- `LISTEN` is only a provisional mapping to the observed combined `PHONE_OR_LISTENING` family.
- `DEFENSIVE` is an Emilio-only provisional binding to the observed special pose. It is not generalized to the other characters.
- Secret-route behavior remains unbound because no secret route is established by supplied art.

## Evidence-bound target mappings

Only five isolated upload-derived assets are named in function compatibility mappings:

- `ROOM01__FIXTURE__DEAL_TABLE__ISO_3Q__A01`
- `ROOM01__FIXTURE__COUCH__ISO_3Q__A01`
- `ROOM01__FIXTURE__FOLDING_CHAIR__ISO_3Q__A01`
- `ROOM01__ITEM__CASH_STACKS__ISO_3Q__A01`
- `ROOM01__ITEM__WRAPPED_PACKAGES__ISO_3Q__A01`

These mappings declare compatible target types only. They do not assert a hotspot, state machine, inventory transfer, measured placement, FP2D variant, or implemented handler. Table/item placement and seat compatibility are labeled as inferences with evidence and confidence.

## Face and size safeguards

- Goose is modeled as an identity-specific native five-slot system. Its validating manifest/recomposition does not make every facial asset production-ready.
- Marcus is described as an observed/inferred native organization with cropped overlapping patches. No generic ten-slot chassis art is claimed present.
- Emilio remains fixed-expression unless a real replacement contract is found.
- View-size fields require measurement method and confidence. Existing qualitative QA sheets and advisory application defaults are not treated as a measured size bible.
- Identity or proportion drift is represented in limitations, not silently normalized.

## Status and missing art

Schemas use the delivery taxonomy: `PRODUCTION_READY`, `PRODUCTION_CANDIDATE`, `AUTHORING_SOURCE`, `REFERENCE`, `QA_ONLY`, `PROVENANCE`, `DEPRECATED`, `QUARANTINE`, and `BLOCKED_MISSING`.

The fixture and item schemas permit both room views, but catalog integration must not claim `VIEW_FP2D` compatibility for the supplied ISO candidates. Missing FP2D variants remain `BLOCKED_MISSING` rather than perspective-converted derivatives.

## Schema design

The twelve files are standalone JSON Schema Draft 2020-12 documents:

1. `room_manifest.schema.json`
2. `view_profile.schema.json`
3. `node.schema.json`
4. `fixture.schema.json`
5. `item.schema.json`
6. `character.schema.json`
7. `pose.schema.json`
8. `action.schema.json`
9. `health.schema.json`
10. `inventory.schema.json`
11. `dialogue.schema.json`
12. `pause_menu.schema.json`

The schemas are intentionally compact and manual-editing friendly. Structured geometry uses simple points, rectangles, regions, and confidence fields. Health, inventory, dialogue, and pause-menu schemas define data only and explicitly expose implementation state.

## Integration notes

- Resolve the action draft's empty `pose_ids` and frame arrays only after the final canonical pose IDs are available.
- Confirm generated catalog instances against these schemas after the root integration agent settles final relative paths and IDs.
- Keep node capabilities uninstantiated when art evidence is absent.
- Preserve source hash/path evidence in provenance records; never substitute advisory repository paths for uploaded-source provenance.
- Do not include watermarked, adult/nude, unclear-rights, or prohibited third-party bytes merely because the schemas can describe them.

## Validation performed

All JSON outputs were parsed locally. All twelve schema documents were also checked as valid Draft 2020-12 schema definitions. The two draft catalogs were checked for unique IDs, required command/action coverage, false implementation flags, namespace separation, and absence of absolute path strings.
