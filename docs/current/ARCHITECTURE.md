# Living Comic Engine v0.1 — Architecture

## Purpose

Living Comic v0.1 proves a small deterministic social-world engine whose semantic behavior can later be reproduced outside the browser. The browser is an adapter, not the source of truth.

## Dependency direction

```text
content definitions
      ↓
schemas / core
      ↓
generation ──→ runtime snapshot
      ↓              ↓
actions         engine resolution
      ↓              ↓
              observable events
                     ↓
              perception / attention
                     ↓
                interpretation
                     ↓
                belief update
                     ↓
                  history
                     ↓
             presentation adapter
                     ↓
                  web UI
```

Hard rule:

```text
web / presentation → semantic core
semantic core -X→ React / DOM
```

## Package responsibilities

- `src/living-comic/schemas/` — serializable content and runtime record contracts.
- `src/living-comic/core/` — IDs, propositions, world-fact projection, seeded RNG, narrative role binding.
- `src/living-comic/generation/` — deterministic Narrative LEGO composition plus playability validation.
- `src/living-comic/actions/` — shared player/NPC action factories, Function routing, NPC scoring, Deal lifecycle.
- `src/living-comic/engine/` — commitment, priority, resolution, Scene Pressure, history promotion, termination, replay.
- `src/living-comic/cognition/` — attention, channel access, perception, interpretation, belief revision.
- `src/living-comic/realization/` — BASED/paralanguage/pose/face/balloon/wording realization.
- `src/living-comic/presentation/` — privileged Debug adapter and player-safe Play adapter.
- `src/living-comic/web/` — browser interaction and comic surface only.
- `content/` — reusable authored definitions; no complete scenario bundles.
- `src/living-comic/fixtures/` — deterministic semantic demonstrations and conformance fixtures.

## Runtime causal order

A Beat has one principal action opportunity per active actor. The player draft is private and non-causal until `End Beat & Observe`.

```text
1. immutable pre-Beat snapshot
2. player package supplied
3. both NPCs select from their restricted pre-Beat decision views
4. all three actions commit
5. priority + seeded stable actor order determine resolution order
6. actions resolve sequentially against current world state
7. Scene Pressure advances
8. Goals and accepted Deals are evaluated
9. ordered Observable Events are processed
10. attention and perceptual access determine Perceptions
11. NPCs form bounded Interpretations
12. Beliefs update
13. grounded meaningful events promote to History
14. terminal predicates are checked
15. player-safe presentation is derived
```

NPCs never inspect the player's draft and never replan during resolution.

## Narrative role identity versus initiative

Narrative role bindings (`SELF`, `COUNTERPART`, `THIRD_PARTY`, `PRIMARY_OBJECT`, `ROOM`, `EXIT_ZONE`) are resolved from explicit character roles and entity identity.

`stableActorOrder` is independently assigned by the scene seed and is used only to break equal-priority action ties. Narrative meaning must never be inferred from initiative order.

## Determinism

All generation randomness flows through the explicit seeded RNG. Runtime IDs derive from stable semantic inputs and deterministic ordinals. There is no runtime LLM, random UUID, `Math.random`, or wall-clock dependency in the semantic engine.

## Player-safe presentation

Normal Play consumes a filtered view model. It may expose only player-owned motivation, player beliefs, legitimately known history/relationships/obligations, player perceptions, and stage state that is legitimately visible. Debug receives a structured clone of privileged state and reports but is read-only.

## Bounded v0.1 choices

v0.1 intentionally fixes three actors, one room, one action per actor per Beat, 1–3 active objects, binary certainty, finite interpretation candidates, transparent weighted NPC scoring, and eight BASED Vibes. General N-actor simulation, Design Mode, Scenario Builder, runtime AI, campaign persistence, and skeletal/body-socket production are later concerns.
