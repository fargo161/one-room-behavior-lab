# Living Comic Engine v0.1 foundation

This directory is the additive, framework-independent Living Comic semantic core. At the Phase 3 checkpoint it deliberately contains contracts, portable content, deterministic situation generation, and validation only. It does not yet contain action resolution, interpretation, message realization, or a player UI.

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

Stable IDs are lowercase snake case. Definition IDs remain independent of labels, while runtime IDs derive from semantic role, input seed, and deterministic ordinal—not random UUIDs or display text.
