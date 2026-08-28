# Modular Character Asset Schema v0.1

## Document status and authority

This document is the current authority for the reusable visual-character asset grammar introduced by this pass. It governs modular visual assets, face-slot composition, compatibility, authored visual recipes, and the conceptual interface between face and body presentation systems.

It does not supersede Living Comic semantic contracts. In particular, [`ARCHITECTURE.md`](ARCHITECTURE.md), [`SEMANTIC_INVARIANTS.md`](SEMANTIC_INVARIANTS.md), [`ENGINE_CONTRACTS.md`](ENGINE_CONTRACTS.md), and [`CONTENT_AUTHORING.md`](CONTENT_AUTHORING.md) remain authoritative for simulation state, causality, epistemic boundaries, realization, and semantic content.

Older Marcus / Trapface naming conventions are superseded only where they conflict with this visual-asset schema. The original `trapface.pxz` remains an authoring source. No derived PXZ becomes canonical merely because this specification exists.

### Decision-status legend

| Label | Meaning |
| --- | --- |
| **LOCKED** | Owner-approved and normative for v0.1. |
| **PROPOSED / NON-NORMATIVE** | Illustrative design that may be useful but is not owner-approved syntax or policy. |
| **FUTURE** | Intentionally outside the active v0.1 grammar. |
| **OPEN** | A required decision has not yet been locked. |

Examples in this document do not become normative merely because they use YAML-like syntax. Exact JSON, Zod, TypeScript, file-layout, machine-ID, revision, confidence, and z-band syntax remains **OPEN** unless explicitly identified as **LOCKED**.

### Decision-status register

| Subject | Status |
| --- | --- |
| Core visual-asset distinctions and anatomical-side convention | **LOCKED** |
| Stable asset identity separate from editable display name | **LOCKED** |
| Display-name form `<slot>__<short_visual_description>` | **LOCKED** |
| One primary slot plus controlled coverage | **LOCKED** |
| Structural asset types and four compatibility states | **LOCKED** |
| Solo-safety admission, Authoring Mode, and Production Mode | **LOCKED** |
| Face Slot Grammar v0.1 and eye precedence | **LOCKED** |
| Recipe identity, exact asset references, approved substitutes, and local exceptions | **LOCKED** |
| Active orientation value `primary` | **LOCKED** |
| Shared face/body asset grammar and minimum attachment concepts | **LOCKED** |
| Exact machine-ID, confidence, z-band, revision, and serialization syntax | **OPEN** |
| Exact composition-mode enum names | **OPEN**; examples are **PROPOSED** |
| Complete body, hair, garment, shoe, and accessory slot vocabularies | **FUTURE** |
| Second orientation name and geometry | **FUTURE / OPEN** |

## Purpose

This schema defines reusable primitives and composition rules for character presentation assets. It supports:

- Marcus / Trapface facial-expression assets;
- future character-specific face libraries;
- authored expression recipes;
- future modular body assets and body-pose recipes; and
- later neighboring hair, garment, shoe, and accessory systems.

Its governing principle is:

> Every visual piece is a tracked building block with a stable identity, a physical placement, declared coverage, combination rules, and intended stacking behavior.

## Scope

This is a documentation and architecture contract. It defines what future asset records and recipes must mean. It does not select a concrete serialization format or implement a renderer.

The schema is character-agnostic. Character-specific asset libraries implement it without redefining its meanings. Marcus is the first concrete example, not the global schema.

## Non-goals

This document does not:

- implement a runtime face or body system;
- alter encounter reducers, gameplay, simulation, or replay;
- edit, crop, repaint, regroup, rename, or reorder PNG or PXZ assets;
- define an Expression Director;
- define complete body, hair, garment, shoe, or accessory vocabularies;
- map the actual Marcus source layers into production asset records;
- promote experimental derivative PXZ work to canonical status;
- merge, retarget, or broaden an existing pull request; or
- redefine Living Comic semantic state or semantic engine contracts.

## Relationship to the Living Comic runtime

This is a visual realization and asset-resolution contract. `RuntimeSnapshot` and the Living Comic semantic core remain authoritative for world state and causality. A visual asset or recipe may express an approved presentation cue, but it must not invent or reveal a claim, Goal, Reason, Function, belief, intention, tactic, Result, Event, Perception, Interpretation, Deal, or history fact.

The downstream relationship is:

```text
semantic state
    ↓
presentation / realization cue
    ↓
visual recipe selection
    ↓
character assembly
```

Visual metadata is presentation data, not evidence of private semantic truth. Player-facing IDs, labels, filenames, tags, alt text, and diagnostics must preserve the player-safe presentation boundary.

Existing `RealizedMessage.faceId` remains an abstract Living Comic presentation-cue reference. It is not a visual recipe ID or component-asset ID, and this schema does not rename that runtime field. Conceptually, resolution is:

```text
existing faceId / abstract face cue
+ character visual-library identity
+ orientation
+ explicit deterministic variant context
        ↓
visual expression recipe identity
        ↓
exact component-asset identities
```

These identity kinds are non-interchangeable and must be reference-validated. The exact namespace and mapping-record syntax remains **OPEN**. The rule against emotional wording in stable visual asset and recipe identities does not retroactively redefine existing abstract cue IDs such as `face_guarded`.

A future visual resolver may consume only an already-realized public face cue, character visual-library identity, orientation, approved bindings, pinned manifest/schema context, and explicit deterministic variant context. It must not inspect private Goals, Reasons, beliefs, tactics, Functions, intentions, NPC Interpretations, world truth, or the player's uncommitted draft. Play receives a filtered render-ready assembly rather than raw authoring metadata.

The semantic Message remains authoritative. Component metadata and recipe identity are not semantic truth. Once an approved public cue is emitted through the existing realization and Observable Event path, its visible result may serve as bounded evidence for interpretation; the asset resolver itself never creates Perceptions, Interpretations, beliefs, or history.

## Core combinatorial model

```text
GLOBAL CHARACTER ASSET SCHEMA
        ↓
CHARACTER-SPECIFIC ASSET LIBRARY
        ↓
COMPATIBILITY / COVERAGE RULES
        ↓
AUTHORED RECIPES
        ↓
FACE / BODY ASSEMBLY
        ↓
PRESENTATION
```

### Core terms

| Term | Normative meaning |
| --- | --- |
| **Slot** | Where the artwork belongs in an assembly. |
| **Coverage** | Which controlled anatomical regions its pixels occupy. |
| **Appearance** | What the artwork visibly does. |
| **Interpretation** | What that appearance may communicate emotionally or socially. |
| **Compatibility** | What other assets the asset can coexist with and under what conditions. |
| **Recipe** | An approved, intentional combination of exact assets. |

These categories must not be collapsed. A `lower_face` asset may cover the mouth, cheeks, jaw, chin, and nose while having observable lip compression and possible guarded or skeptical interpretations. Those are distinct facts.

### Selectable is not approved

An asset combination may be structurally selectable without being artistically approved. Structural validation can identify references, cardinality, coverage collisions, and rule violations. It cannot promote a combination to `proven`.

The v0.1 face grammar has seven optional occupied/unoccupied slots. With one candidate asset available for each optional slot, a selected base permits:

```text
2^7 = 128 structural occupancy patterns
```

For a library with multiple choices, the candidate count before compatibility and recipe approval is:

```text
base_head_count
× (1 + brow_left_count)
× (1 + brow_right_count)
× (1 + eye_pair_count)
× (1 + eye_left_closed_count)
× (1 + eye_right_closed_count)
× (1 + lower_face_count)
× (1 + face_overlay_count)
```

This is a mathematical candidate space, not a claim that every result is visually valid.

## Global modular asset record

The following table defines required information. It does not lock exact property names or serialization shape unless noted.

| Record area | Required information | Status |
| --- | --- | --- |
| Identity | Stable machine identity independent of editable wording | **LOCKED** constraint; exact syntax **OPEN** |
| Human label | `<slot>__<short_visual_description>` | **LOCKED** |
| Library context | The character-specific visual library to which the asset belongs | **LOCKED** concept; exact field **OPEN** |
| Placement | Exactly one primary face or future body slot | **LOCKED** |
| Anatomical side | `left` and `right` mean the character's sides | **LOCKED** |
| Orientation | Active v0.1 value is `primary` | **LOCKED** |
| Coverage | One or more legal controlled coverage regions | **LOCKED** |
| Structure | `atomic`, `paired`, `composite`, or `overlay` | **LOCKED** |
| Composition | A declaration of how pixels behave in assembly | **LOCKED** requirement; exact enum **OPEN** |
| Appearance | Literal observable actions or visual properties | **LOCKED** distinction; exact vocabulary **OPEN** |
| Interpretation | Separate emotional or social interpretation tags | **LOCKED** distinction; exact vocabulary **OPEN** |
| Classification confidence | Explicit confidence in ambiguous classification | **LOCKED** concept; exact enum **OPEN** |
| Compatibility | Relational status, rules, conditions, and exceptions | **LOCKED** concepts; exact record shape **OPEN** |
| Solo safety | Acceptance evidence that the asset works alone over its intended base | **LOCKED** admission requirement; evidence shape **OPEN** |
| Stacking | Sensible default position plus support for recipe-local override | **LOCKED** concept; exact z-band enum **OPEN** |
| Provenance | Originating source-layer identifier and source-layer name when available | **LOCKED** |
| Base-head qualifiers | Base type plus neutral or baked-expression state, when the asset is a `base_head` | **LOCKED** conditional information |
| Recipe membership | References from approved recipes or recipe indexes without changing asset identity | **LOCKED** relationship; storage location **OPEN** |

## Stable identity and human-readable labels

Every asset has a stable machine identity separate from its editable display name.

### Stable identity

Machine identity contains only durable structural information. It must not depend on interpretations such as `angry`, `guarded`, `skeptical`, or `happy`.

The exact string syntax is not owner-locked. The following is **PROPOSED / NON-NORMATIVE** only and illustrates a structurally neutral ID compatible with the repository's existing lowercase-snake-case ID style:

```text
visual_asset_marcus_0003
```

Slot and orientation remain record data that may be corrected without replacing permanent identity. Source-layer IDs are provenance references, not canonical visual asset identities.

### Display name

The display-name form is **LOCKED**:

```text
<slot>__<short_visual_description>
```

Valid examples include:

```text
brow_left__raised_inner
brow_right__lowered_outer
eye_pair__narrowed
lower_face__lip_press
face_overlay__sweat
```

Visual descriptions may be revised without changing stable machine identity.

Display names, recipe names, visual-reading tags, confidence, review notes, and diagnostics are authoring/debug metadata by default. They must not automatically become factual player-facing copy. Player-visible text should prefer literal appearance unless the existing player-safe presentation adapter explicitly selects an approved cue label.

## Anatomical side convention

`left` and `right` always mean the character's anatomical left and right, regardless of camera view or screen position. This applies consistently to face and future body assets.

Viewer-relative sides must not be encoded as canonical asset sides. Projection or mirroring may derive a screen side without changing anatomical identity.

## Orientation

The only active v0.1 orientation value is:

```text
primary
```

Do not rename it `front`, `three_quarter`, or another geometric claim. A future second view introduces another orientation value without redesigning the slot, coverage, compatibility, or recipe schema. Its name and geometry remain **FUTURE / OPEN**.

## Slot and coverage

Every modular asset has exactly one primary slot and an explicit coverage map.

The slot states the asset's placement category. Coverage records the relevant expressive-face regions occupied by its artwork. Coverage is not an exhaustive inventory of every painted pixel in a base portrait.

Example:

```yaml
slot: lower_face
coverage:
  - nose
  - cheek_left
  - cheek_right
  - mouth
  - jaw
  - chin
```

## Controlled coverage vocabulary v0.1

Only these coverage values are legal in v0.1:

| Coverage value | Region |
| --- | --- |
| `forehead` | Expressive forehead area |
| `brow_left` | Character's left brow region |
| `brow_right` | Character's right brow region |
| `eye_left` | Character's left eye region |
| `eye_right` | Character's right eye region |
| `nose` | Nose and immediately relevant nose-tension area |
| `cheek_left` | Character's left cheek region |
| `cheek_right` | Character's right cheek region |
| `mouth` | Lips, mouth opening, and directly associated mouth area |
| `jaw` | Jaw and jaw-tension region |
| `chin` | Chin region |

New coverage terms require a schema revision. Character-specific records must not invent coverage labels ad hoc.

## Structural asset types

Every asset declares exactly one structural type:

| Type | Meaning |
| --- | --- |
| `atomic` | A truthful single-region or single-side component. |
| `paired` | One asset intentionally containing a paired anatomical region. |
| `composite` | One truthful building block spanning multiple features or coverage regions. |
| `overlay` | A supplemental, non-structural visual layer. |

Composite does not mean defective. The rule is to use the smallest truthful modular unit supported by the artwork, not to force artificial atomization.

## Composition behavior

Every asset separately declares how it behaves visually. Structural type and composition behavior are not the same fact.

The exact composition-mode vocabulary is **OPEN**. The following labels are **PROPOSED / NON-NORMATIVE** examples:

| Proposed label | Illustrative behavior |
| --- | --- |
| `replacement` | Replaces the base presentation for its intended region. |
| `structural_patch` | Adds or substitutes structural pixels while retaining surrounding base pixels. |
| `overlay` | Adds non-structural detail above an existing assembly. |
| `effect` | Adds a stylized or transient visual effect. |

Future serialization must preserve the locked requirement without treating these proposed spellings as owner-approved.

## Appearance versus interpretation

Literal appearance and emotional/social interpretation are different record areas.

```yaml
observable_actions:
  - eye_narrow
  - brow_raise_inner
  - lip_press

interpretation_tags:
  - guarded
  - skeptical
  - suspicious
```

Observable actions describe what is drawn. Interpretation tags describe possible readings. Interpretation must never appear in stable asset identity and must not be treated as authoritative character intention or belief.

The conceptual terms Appearance and Interpretation are required distinctions in this visual schema. They are not Living Comic runtime `Action` or `Interpretation` records. The YAML-like names `observable_actions` and `interpretation_tags` shown here are illustrative only. These authoring annotations do not enter `ObservableEvent.observableCueIds`, Perceptions, belief update, or history. Any cognition-visible cue semantics must be authored and validated separately through the existing Living Comic presentation and realization path.

## Classification confidence versus compatibility

| Concept | Question answered | Status model |
| --- | --- | --- |
| Classification confidence | How certain is the asset's annotation or classification? | Exact enum **OPEN**; must support high-confidence, likely, and uncertain concepts. |
| Compatibility | Can these assets coexist, and under what approval conditions? | `proven`, `conditional`, `untested`, `incompatible` |

The word `proven` has a locked meaning for compatibility. A future confidence enum should avoid ambiguous reuse of that term. `high`, `likely`, and `uncertain` are **PROPOSED / NON-NORMATIVE** confidence spellings.

## Solo-safety acceptance

Every asset admitted to the usable modular library must be safe when used by itself over its intended base. Solo safety is an acceptance gate, not optional descriptive metadata.

Static validation may detect missing references, illegal regions, empty pixels, or manifest errors, but it cannot by itself establish artistic approval. The exact evidence, reviewer, and record format for solo-safety acceptance remain **OPEN**.

An asset that fails solo safety may remain source evidence or a repair candidate, but it is not an accepted usable modular asset.

A `base_head` passes solo safety by rendering as a valid standalone base for its declared base type and baked-expression state. Replacement and overlay assets pass only when reviewed over an intended compatible `base_head`.

## Compatibility

### Compatibility states

| State | Normative meaning |
| --- | --- |
| `proven` | Human visually reviewed and explicitly approved the combination. |
| `conditional` | Approved only under stated conditions. |
| `untested` | Structurally possible or not known to fail, but not human-approved. |
| `incompatible` | Known not to work in ordinary use. |

Codex, static analysis, and structural checks cannot promote a combination to `proven`.

The following relational shape is **PROPOSED / NON-NORMATIVE** and illustrates that `conditional` must state its conditions rather than behave like a boolean asset field:

```yaml
relationship:
  assets: [<component asset ID>, <component asset ID>]
  status: conditional
  conditions:
    - <specific approved condition>
```

### Paired and composite exclusion

A paired or composite asset normally blocks smaller conflicting slots it covers unless a specific approved exception exists.

Three v0.1 relationships intentionally refine this general rule:

1. `base_head` remains underneath selected replacement assets.
2. A side-specific closed-eye asset may override its side of `eye_pair`.
3. `face_overlay` may overlap structural assets unless that overlay is explicitly incompatible.

Coverage intersection is a conflict signal, not automatic proof of incompatibility. Composition behavior, precedence, stated conditions, and visual review determine the final status.

### Authoring Mode

Authoring Mode permits experimentation. `untested` combinations may be explored with warnings so new expressions and poses can be discovered.

### Production Mode

Production Mode uses approved recipes and compatibility rules. A production combination must use accepted solo-safe assets, resolve all references, satisfy all conditional requirements, and contain no unapproved incompatible relationship.

Production visual resolution must be deterministic. It must not use runtime AI, random UUIDs, wall-clock selection, or hidden or unseeded randomness. Until a deterministic substitute-selection rule is explicitly defined, Production Mode uses each recipe's exact primary asset references; substitutes may be selected only by an explicit persisted choice or another later-approved deterministic rule.

The governing principle is:

> Freedom while authoring; reliability while playing.

## Face Slot Grammar v0.1

The following slot set is **LOCKED**, exhaustive, and authoritative for v0.1 production faces:

| Slot | Cardinality | Role |
| --- | ---: | --- |
| `base_head` | exactly 1 | Required underlying head and base facial artwork |
| `brow_left` | 0–1 | Character's left brow replacement |
| `brow_right` | 0–1 | Character's right brow replacement |
| `eye_pair` | 0–1 | Paired open-eye replacement |
| `eye_left_closed` | 0–1 | Character-left closed-eye override |
| `eye_right_closed` | 0–1 | Character-right closed-eye override |
| `lower_face` | 0–1 | Broad authored lower-face replacement |
| `face_overlay` | 0–1 | Additive non-structural face detail or effect |

The following are not active v0.1 production slots:

```text
brow_pair
eye_left_open
eye_right_open
mouth
cheek_left
cheek_right
chin_patch
jaw_patch
upper_face_patch
mid_face_patch
full_face_patch
```

They may appear only as historical or future concepts until a schema revision explicitly adds them.

## Base-head contract

Every valid face state contains exactly one `base_head`.

The base records whether it is:

| Base type | Meaning |
| --- | --- |
| `feature_complete` | Already contains ordinary brows, open eyes, lower face, and related base artwork. |
| `feature_reduced` | Intentionally prepared to receive modular replacements. |

The base also records whether it is neutral or contains a baked expression. Neutrality must not be assumed.

### Empty-slot semantics

An empty optional slot reveals the corresponding artwork already painted into the active base head. Empty never means erase.

A feature-reduced base may not visually provide every region needed by a base-only recipe. The locked fallback rule remains unchanged, while a future capability mechanism such as `provided_regions` or `required_fill_slots` is **PROPOSED / OPEN**, not owner-approved.

## Brow contract

Brows are always independently selectable as `brow_left` and `brow_right`. There is no `brow_pair` in v0.1. This permits asymmetric expressions while allowing either empty slot to reveal its base-head brow.

## Eye contract and precedence

Open replacement eyes use one paired `eye_pair`. Independent open-left and open-right slots do not exist in v0.1. If `eye_pair` is empty, the base head's open eyes remain visible.

Closed eyes are side-specific overrides: `eye_left_closed` and `eye_right_closed`. They support left wink, right wink, and both-eyes-closed states.

The precedence is **LOCKED**:

```text
closed-eye override
      ↓
eye_pair
      ↓
base open eyes
```

A closed-eye asset overrides only its anatomical side. Therefore `eye_pair + eye_left_closed` uses the closed-eye asset on the left and the open right eye from `eye_pair`.

## Lower-face contract

`lower_face` is one indivisible broad authored replacement slot in v0.1. It may legitimately include:

- mouth, lips, or teeth;
- facial-hair pixels;
- jaw and chin;
- cheek tension;
- nose-adjacent skin; and
- blended edge pixels required for seamless compositing.

Do not crop a truthful regional patch down to the mouth merely to achieve theoretical atomization. A selected `lower_face` replaces the base lower-face performance as one coherent region.

## Face-overlay contract

`face_overlay` is optional, additive, non-structural, and limited to zero or one active asset. It may represent sweat, tears, blush, wrinkles, veins, impact marks, scars, or comic effects.

It does not substitute for brows, eyes, or `lower_face`. It may sit above a valid structural face unless that specific overlay is explicitly incompatible. A face recipe remains valid without an overlay.

## Default stacking and local overrides

Every asset has a sensible default stack position. Default order is fallback behavior, not a rigid artistic restriction. A recipe may store a deliberate local stacking override, and that override must not silently rewrite global asset defaults.

Exact z-band names are **OPEN**. The following order is **PROPOSED / NON-NORMATIVE** only:

```text
TOP
face_overlay
closed-eye overrides
brows / eye_pair / lower_face
base_head
BOTTOM
```

Regardless of the eventual z-band vocabulary, a Production Mode assembly must resolve to one total deterministic paint order. Recipe-local explicit overrides and locked eye precedence are applied deliberately; unresolved stacking ties block production approval until a deterministic rule is defined.

## Illustrative asset records

These examples demonstrate the locked distinctions. Their record shape, machine IDs, composition labels, confidence spelling, and source identifiers are **PROPOSED / NON-NORMATIVE**. The snippets include the required record areas but do not lock their serialization names.

### Atomic brow

```yaml
asset_id: <stable structural asset ID>
display_name: brow_left__raised_inner
visual_library: <character visual library ID>
orientation: primary
slot: brow_left
coverage: [forehead, brow_left]
asset_type: atomic
composition_behavior: replacement
observable_actions: [brow_raise_inner]
interpretation_tags: [questioning, skeptical]
classification_confidence: high
solo_safety: accepted
compatibility: <relational compatibility records>
default_stacking: <default position>
recipe_membership: []
source_layer_id: <source layer ID>
source_layer_name: <source layer name>
```

### Paired open eyes

```yaml
asset_id: <stable structural asset ID>
display_name: eye_pair__narrowed
visual_library: <character visual library ID>
orientation: primary
slot: eye_pair
coverage: [eye_left, eye_right]
asset_type: paired
composition_behavior: replacement
observable_actions: [eye_narrow]
interpretation_tags: [watchful, suspicious]
classification_confidence: high
solo_safety: accepted
compatibility: <relational compatibility records>
default_stacking: <default position>
recipe_membership: []
source_layer_id: <source layer ID>
source_layer_name: <source layer name>
```

### Composite lower face

```yaml
asset_id: <stable structural asset ID>
display_name: lower_face__lip_press
visual_library: <character visual library ID>
orientation: primary
slot: lower_face
coverage: [nose, cheek_left, cheek_right, mouth, jaw, chin]
asset_type: composite
composition_behavior: replacement
observable_actions: [lip_press, jaw_tension]
interpretation_tags: [guarded, restrained]
classification_confidence: likely
solo_safety: accepted
compatibility: <relational compatibility records>
default_stacking: <default position>
recipe_membership: []
source_layer_id: <source layer ID>
source_layer_name: <source layer name>
```

### Face overlay

```yaml
asset_id: <stable structural asset ID>
display_name: face_overlay__sweat
visual_library: <character visual library ID>
orientation: primary
slot: face_overlay
coverage: [forehead, cheek_left]
asset_type: overlay
composition_behavior: effect
observable_actions: [sweat_visible]
interpretation_tags: [strain, alarm]
classification_confidence: high
solo_safety: accepted
compatibility: <relational compatibility records>
default_stacking: <default position>
recipe_membership: []
source_layer_id: <source layer ID>
source_layer_name: <source layer name>
```

## Expression recipe contract

Every expression recipe contains:

| Information | Requirement |
| --- | --- |
| Stable recipe identity | Independent of editable display wording |
| Display name | Human-readable and editable |
| Revision or version | Separate from stable identity |
| Base selection | Exact stable `base_head` asset reference |
| Optional slot selections | Exact stable asset reference or null for every optional face slot |
| Approved substitutes | Small, explicit, slot-scoped alternative set when applicable |
| Local exceptions | Owner-approved compatibility, composition, or stacking exceptions scoped to this recipe |

Exact recipe-ID and revision syntax is **OPEN**.

The following shape is illustrative, not a locked serialization:

```yaml
recipe_id: <stable recipe ID>
display_name: Guarded Suspicion
revision: <revision>

base_head: <asset ID>
brow_left: <asset ID or null>
brow_right: <asset ID or null>
eye_pair: <asset ID or null>
eye_left_closed: <asset ID or null>
eye_right_closed: <asset ID or null>
lower_face: <asset ID or null>
face_overlay: <asset ID or null>
```

Null optional slots use the active base-head artwork; they do not erase it.

### Required recipe examples

All IDs and revisions below are **PROPOSED / NON-NORMATIVE** placeholders containing only structural information. These selection examples remain `untested` until human review approves the exact visual combinations.

| Display example | `recipe_id` | Revision | `base_head` | `brow_left` | `brow_right` | `eye_pair` | `eye_left_closed` | `eye_right_closed` | `lower_face` | `face_overlay` |
| --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| Base-only | `visual_recipe_0001` | 1 | `asset_base_0001` | null | null | null | null | null | null | null |
| Asymmetric brows | `visual_recipe_0002` | 1 | `asset_base_0001` | `asset_brow_left_0001` | null | null | null | null | null | null |
| Eye-pair replacement | `visual_recipe_0003` | 1 | `asset_base_0001` | null | null | `asset_eye_pair_0001` | null | null | null | null |
| Wink over eye pair | `visual_recipe_0004` | 1 | `asset_base_0001` | null | null | `asset_eye_pair_0001` | `asset_eye_left_closed_0001` | null | null | null |
| Both eyes closed | `visual_recipe_0005` | 1 | `asset_base_0001` | null | null | null | `asset_eye_left_closed_0001` | `asset_eye_right_closed_0001` | null | null |
| Lower-face replacement | `visual_recipe_0006` | 1 | `asset_base_0001` | null | null | null | null | null | `asset_lower_face_0001` | null |
| Overlay reaction | `visual_recipe_0007` | 1 | `asset_base_0001` | `asset_brow_left_0001` | `asset_brow_right_0001` | `asset_eye_pair_0001` | null | null | `asset_lower_face_0001` | `asset_face_overlay_0001` |

The base-only example assumes a `feature_complete` base. A feature-reduced base may need nonempty slots; that validation mechanism remains **OPEN**.

## Approved substitutes

A recipe may declare a small set of explicitly approved alternatives for one slot:

```yaml
recipe_id: <stable recipe ID>
eye_pair:
  primary: <asset ID>
  approved_substitutes:
    - <asset ID>
    - <asset ID>
```

This is a conceptual shape. Approved substitutes are deliberate alternatives, not arbitrary assets that merely pass structural checks. Substitutes inherit no approval outside the recipe and slot in which they were accepted.

Substitute choice in Production Mode must be explicit and deterministic. The exact approved selection algorithm is **OPEN**; no implementation may silently randomize among substitutes.

## Recipe-local exceptions

Owner-approved unusual overlap, composition behavior, conditional substitute, or stacking remains local to the recipe. A local exception must state what it overrides and why. It must not rewrite the global compatibility status or default stacking of the involved assets.

The following is **PROPOSED / NON-NORMATIVE**:

```yaml
recipe_id: <stable recipe ID>
local_exceptions:
  - kind: stacking
    assets: [<component asset ID>, <component asset ID>]
    override: <explicit local paint order>
    approval_note: <why this recipe-specific result is accepted>
```

## Validation and promotion rules

### Asset admission

An asset is admitted to the usable modular library only when:

1. its stable identity and any required or applicable provenance reference resolve;
2. its display name follows the locked convention;
3. its primary slot, orientation, structural type, and coverage are legal;
4. appearance and interpretation metadata remain separate;
5. ambiguous classification is represented rather than hidden;
6. its default composition and stacking behavior are recorded; and
7. it passes the solo-safety acceptance gate over its intended base.

### Recipe validation

A recipe is structurally valid only when:

1. it contains exactly one `base_head` selection;
2. it uses only active v0.1 slots and respects every cardinality;
3. every asset and approved-substitute reference resolves;
4. every referenced asset's primary slot matches the recipe field;
5. selected assets use a compatible character library and `primary` orientation;
6. approved substitutes occupy the same slot as their primary selection;
7. all `conditional` requirements are satisfied;
8. any otherwise incompatible relationship has an explicit owner-approved recipe-local exception; and
9. local stacking overrides leave global asset defaults unchanged.

Structural validity does not make the recipe `proven`.

### Combination review

| Stage | Permitted conclusion |
| --- | --- |
| Schema/reference validation | Structurally valid or invalid |
| Coverage and exclusion analysis | Potential conflict, rule-compliant, or rule-violating |
| Authoring preview | `untested` unless prior approval already applies |
| Human visual review | May approve `conditional`, approve `proven`, or mark `incompatible` |
| Production recipe review | May admit exact selections, approved substitutes, and explicit local exceptions |

The exact evidence fields, reviewer identity format, timestamps, screenshots, and promotion workflow remain **OPEN**. Static validation never grants `proven`.

## Reuse across characters

The schema distinguishes three kinds of reuse:

| Reuse type | Meaning |
| --- | --- |
| Schema reuse | Characters share the same structural grammar and record meanings. |
| Recipe-pattern reuse | Characters may share an abstract pattern such as narrowed eyes plus brow tension plus lip compression. |
| Raster-asset reuse | Actual painted pixels may be reused only when visually and structurally appropriate; they are usually character-specific. |

Sharing a recipe pattern does not imply sharing the same exact asset IDs or artwork.

## Shared face/body architecture

Face and body use different slot vocabularies implemented through one global asset grammar:

```text
GLOBAL MODULAR CHARACTER ASSET SCHEMA v0.1
│
├── FACE SLOT GRAMMAR v0.1
│       ↓
│   CHARACTER-SPECIFIC FACE ASSETS
│       ↓
│   APPROVED EXPRESSION RECIPES
│
└── FUTURE BODY SLOT GRAMMAR
        ↓
    CHARACTER-SPECIFIC BODY ASSETS
        ↓
    APPROVED BODY-POSE RECIPES
```

Future body assets reuse stable identity, display labels, slot and coverage separation, structural type, composition behavior, appearance and interpretation separation, compatibility, confidence, stacking, provenance, recipes, and orientation.

Concepts such as `body_core`, `arm_left`, `arm_right`, `arms_pair`, `leg_left`, and `leg_right` are **FUTURE / NON-NORMATIVE** illustrations, not an approved body taxonomy.

## Face-to-body interface

The minimum conceptual bridge is **LOCKED**:

| Concept | Purpose |
| --- | --- |
| `head_anchor` | Attachment reference supplied by the body/head assembly |
| `face_anchor` | Corresponding reference in the face assembly |
| `scale` | Scale relationship between the assemblies |
| `rotation` | Rotation relationship between the assemblies |

Coordinate units, origins, axes, pivot conventions, and serialization remain **OPEN**. The face schema does not know body limb internals.

Eventually:

```text
BODY RECIPE
+ FACE RECIPE
+ ORIENTATION
+ ATTACHMENT TRANSFORM
= COMPLETE CHARACTER PRESENTATION
```

## Future neighboring systems

Hair, garments, shoes, and accessories are **FUTURE** neighboring systems. The intention is to reuse the general pattern:

```text
stable slots
+ replaceable assets
+ compatibility rules
+ authored recipes
```

Their final slot, coverage, composition, and recipe vocabularies are not defined here.

## Provenance

Provenance is intentionally lightweight. Each derived asset tracks its originating source-layer identifier and source-layer name or label when available.

The schema does not require a complete historical chain through intermediate extraction files to an original full image. Character-specific pipelines may retain deeper provenance as optional evidence, but it is not a v0.1 admission requirement.

## Marcus / Trapface application notes

Marcus is an application example, not the schema.

- Marcus currently uses regional painted patches rather than perfectly isolated anatomical sprites.
- Broad `lower_face` patches are legitimate first-class modular assets.
- Open replacement eyes are paired.
- Closed-eye alternatives may become side-specific overrides when they meet acceptance requirements.
- Brows are classified into independently selectable anatomical slots; cross-asset compatibility remains unproven until reviewed.
- Blended skin edges are permitted when required for seamless compositing.
- The original `trapface.pxz` remains an authoring source, not a runtime schema.
- Earlier experimental derivative PXZ work does not become canonical because this document exists.
- Existing paired closed-eye or otherwise nonconforming source layers remain source evidence or repair candidates until they can truthfully satisfy the locked v0.1 slots and solo-safety gate; the global grammar is not widened implicitly to admit them.
- Actual Marcus source-layer mapping belongs in a separate future ingestion document.

## Supersession rules

This document supersedes older Marcus / Trapface naming conventions only where they conflict with the reusable visual-asset grammar, including:

- stable machine identity being independent of emotional description;
- human-readable placement-first display names;
- the locked v0.1 face-slot vocabulary; and
- the separation of slot, coverage, appearance, interpretation, compatibility, and recipe.

It does not supersede Living Comic semantic authority, player-safe presentation rules, deterministic engine contracts, or content-authoring semantics.

Adding a production face slot or coverage value requires an explicit schema revision. Character-specific mapping documents may specialize assets and recipes without redefining global meanings.

## Open questions

The following remain **OPEN**:

- exact machine-ID string syntax and namespace mapping;
- exact classification-confidence enum spelling;
- the structural type and composition behavior assigned to `base_head`;
- exact composition-mode enum names;
- exact z-band enum names and stable tie-breaking behavior;
- exact asset, recipe, and revision serialization;
- exact compatibility-rule record mechanics;
- exact solo-safety evidence and reviewer record;
- exact promotion evidence for `conditional` and `proven`;
- feature-reduced base capability and required-fill validation;
- whether recipes may inherit from other recipes;
- exact deterministic selection rules for approved substitutes;
- exact face-to-body coordinate system;
- complete body-slot and body-coverage vocabularies;
- future second-orientation name and geometry;
- hair, garment, shoe, and accessory vocabularies; and
- exact JSON, Zod, TypeScript, and on-disk representation.

## Success criterion

This schema preserves modularity without equating combinatorially selectable with artistically approved.

The governing relationships are:

```text
GLOBAL MODULAR CHARACTER ASSET SCHEMA v0.1
        ↓
FACE SLOT GRAMMAR v0.1
        ↓
CHARACTER-SPECIFIC FACE ASSETS
        ↓
APPROVED EXPRESSION RECIPES

GLOBAL MODULAR CHARACTER ASSET SCHEMA v0.1
        ↓
FUTURE BODY SLOT GRAMMAR
        ↓
CHARACTER-SPECIFIC BODY ASSETS
        ↓
APPROVED BODY-POSE RECIPES
```
