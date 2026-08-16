# Living Comic Engine v0.1

This directory is the additive Living Comic semantic engine, deterministic realization layer, player-safe presentation boundary, browser vertical slice, and canonical acceptance fixture. The One-Room Behavior Lab v0.3.1 implementation remains isolated in its existing modules/tests as a preserved regression reference.

## Dependency boundary

```text
web / presentation → living-comic semantic core
living-comic semantic core -X→ React / DOM
```

All authoritative runtime/content structures are serializable data. Zod schemas protect load/runtime boundaries. Generation and replay are explicitly seeded and contain no hidden global mutable simulation state.

## Contracts and content

- `schemas/` separates WorldFact, Belief, Goal, Reason, Obstacle, Action, Result/Event, Perception, Interpretation, Deal, History, RuntimeSnapshot, reports, and presentation records.
- `content/` loads repository-root reusable definition pools and validates cross-references.
- `generation/` composes conflict skeleton, actors, Goals/Reasons, history, Obstacles, Goal-relevant asymmetry, relationships, objects, room, and Scene Pressure, then runs explicit playability validation.
- `core/roles.ts` keeps narrative role bindings separate from independently seeded equal-priority actor order.

## Simulation

`actions/` owns the shared player/NPC action grammar, four-Function routing, transparent NPC scoring, and Deal lifecycle. `engine/` owns commitment, ordered resolution, Scene Pressure, grounded history promotion, termination, and replay. `cognition/` owns attention, perceptual channels, finite interpretation, and belief revision.

One principal action per active actor per Beat is the locked v0.1 rule. All actors choose from pre-resolution state. `End Beat & Observe` is the only Play control that advances simulation.

## Realization and presentation

`realization/` applies the eight-vibe v0.1 BASED slice to wording cadence, paralanguage, pose, face, balloon, and interpretation cues without inventing unrepresented semantic claims. `presentation/` provides separate player-safe Play and privileged read-only Debug models.

The browser surface supports deterministic scene generation, Goal/Reason choice, clickable characters/objects/zones, state-valid Direct drafting, semantic Ask/Pressure/Deal/Counter terms, Open/Private content delivery, BASED delivery selection, preview, comic results, Play/Debug, canonical RuntimeSnapshot save/restore, and replay export.

## Phase 9 acceptance

`fixtures/phase9Acceptance.ts` is the final canonical deterministic v0.1 fixture. The same fixture can be loaded from the setup screen and played manually through the normal Action Builder.

The nine-Beat script demonstrates:

- private communication occurrence without third-party content leakage;
- attention diversion;
- Ask;
- Deal proposal and rejection;
- later Deal acceptance and obligations;
- Direct physical movement;
- Pressure;
- a false certain belief weakened and revised by later direct evidence;
- different NPC interpretations of the same events;
- grounded history promotion;
- skeleton terminal resolution;
- replay equality from the exact canonical initial RuntimeSnapshot plus player packages.

## Reconciliation repairs

The v0.1 closure also separates narrative roles from seeded initiative, requires Goal/Obstacle-relevant generated asymmetry, adds legitimate observer Reason/history evidence to interpretation, grounds runtime history in controlled history-action IDs, fixes Deal violation provenance, emits meaningful Deal lifecycle events, prevents BASED realization from adding hidden claims, filters holder knowledge in Play, exposes all active objects to Direct drafting, and translates context-level `PROTECTED true` Goals to executable `EXPOSED false` immediate intentions without inventing a new Function.

Repository-level documentation now lives under `docs/`, with a machine-readable content map at `content/manifest.json`.
