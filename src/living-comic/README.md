# Living Comic Engine v0.1

This directory contains the additive Living Comic semantic core, deterministic BASED/message realization, player-safe presentation adapter, Debug adapter, and Phase 8 browser surface. The legacy One-Room Behavior Lab remains isolated in its original modules and tests.

## Dependency boundary

```text
future web / presentation -> living-comic simulation core
living-comic simulation core -X-> React / web
```

All runtime and content structures are plain serializable data. Schema contracts use Zod at load and assembly boundaries. The generator receives an integer seed, owns its local xorshift32 stream, and returns a complete `GeneratedScene`; it has no module-global mutable state.

## Phase 1 contracts

`schemas/primitives.ts` defines stable semantic IDs, Propositions, channels, and template references. `schemas/content.ts` defines reusable content atoms. `schemas/runtime.ts` defines world truth, beliefs, motivations, history, actions, events, perceptions, interpretations, deals, runtime snapshots, resolution reports, presentation views, and generation/validation traces.

Important pairs are represented separately rather than inferred from each other:

- `Goal` and `Reason`
- `WorldFact` and `Belief`
- action drafts and result/event contracts
- events, perceptions, and interpretations
- physical `HELD_BY` and social/legal `OWNED_BY`

`OFFER_OBJECT` declares an availability attempt only. Its content contract requires acceptance before possession transfer and an independent explicit rule before ownership transfer.

## Phase 2 portable content

The repository-root `content/` directory contains individual JSON definition pools for the five conflict skeletons, six object categories, three room categories, eight BASED Vibes, characters, objects, Goals, Reasons, relationships, history actions, pressures, direct actions, presentation cues, and small message-fragment pools. There is intentionally no scene, encounter, or adventure bundle.

`content/index.ts` parses the manifest and validates every cross-reference before generation.

## Phase 3 composition

`generation/generator.ts` independently selects reusable atoms, instantiates role-relative Proposition templates, constructs real obstacle facts, grounds Reasons and relationships in a two-to-four event history, creates differing beliefs, and emits two or three player Goal/Reason options. Every candidate passes through `generation/validator.ts`.

Invalid candidates are rejected with explicit check results. The generator advances to a deterministically derived attempt seed and retries; it never silently rewrites incompatible facts or forces incompatible content to fit. `generation/report.ts` provides a human-readable checkpoint serialization without changing authoritative runtime data.

## Phase 4–6 engine

`actions/` owns the shared player/NPC action factories, causal Function routing, truth-free NPC decision views, weighted candidate scoring, and Deal lifecycle. `engine/` owns commitment, priority ordering, action results, Scene Pressure, history promotion, and termination. `cognition/` owns ordered attention, perceptual channel access, finite interpretations, and belief revision. `fixtures/phase6Demonstration.ts` executes the deterministic five-Beat checkpoint fixture.

Portable predicate cardinality is data-driven in `content/semantic/predicate-semantics.json` and documented in `docs/PREDICATE_SEMANTICS.md`. Language-neutral Phase 4–6 contracts and forbidden data access are documented in `docs/PHASE_4_6_ENGINE_CONTRACTS.md`.

## Phase 7–8 realization and presentation

`realization/` converts semantic Messages into deterministic wording plus structured paralanguage, pose, face, balloon, and interpretation cues. `presentation/` owns the hard Play/Debug data boundary. `web/` renders scene setup, Goal/Reason selection, What I Know, What I Noticed, Deal state, the shared action builder, preview, comic results, and the read-only causal inspector.

Still out of scope until the Phase 8 checkpoint is approved:

- Phase 9 final acceptance fixture expansion
- final documentation and Unity/Adventure Creator handoff pass

Stable IDs are lowercase snake case. Definition IDs remain independent of labels, while runtime IDs derive from semantic role, input seed, and deterministic ordinal—not random UUIDs or display text.
