# Living Comic Engine v0.1 — Engine Contracts

## Canonical state

`RuntimeSnapshot` is the serializable authority for current semantic state. It contains world facts, characters, Goals/Reasons/Obstacles, beliefs, relationships, objects/room, Deals/terms/obligations, messages/realizations, attention, Scene Pressure, grounded history, Beat/phase/seed, stable actor order, and terminal state. Browser UI state is excluded.

## Resolution contract

`resolveBeat(state, playerPackage, content)` is deterministic and returns a new `LivingComicEngineState` containing the next RuntimeSnapshot plus an appended structured `BeatResolutionReport`.

A report includes committed actions, immutable commit snapshot IDs, resolution order, action results, events, perceptions, interpretations, belief updates, NPC candidate traces, Deal lifecycle changes, Goal satisfaction, Scene Pressure event IDs, history promotions, and terminal reason.

## Priority

Canonical order:

```text
1 attention/focus-changing
2 movement/position
3 object/world manipulation
4 message-only social behavior
5 exit/terminal movement
```

Equal priority uses independently seeded `stableActorOrder`.

## Functions

Immediate Proposition changes route causally through exactly the v0.1 Function vocabulary:

```text
ESCAPE
ATTENTION
ACCESS
SENSORY
```

Function is not a post-hoc label. It constrains candidate Direct operations and participates in NPC scoring/interpretation.

## NPC selection

NPC selection uses a restricted `ActorDecisionView` and transparent weighted candidates. Primary Goal dominates; beliefs constrain possibilities; current Obstacle, secondary Goals, Deal obligations, Scene Pressure, and Function fit modify score. Stable deterministic tie-breaking is required.

`PROTECTED true` is a context-level Goal. The v0.1 selector derives `EXPOSED false` as its executable immediate intention while retaining primary-Goal scoring. This does not make `PROTECTED` directly routable.

## Perception and belief timing

World state mutates as committed actions resolve, but actors do not revise committed actions mid-Beat. After actions and Scene Pressure, the ordered event stream is filtered through attention/channel access. NPC Interpretations are finite hypotheses; belief updates then apply direct and interpretive evidence.

## Replay

`ReplaySpecV01` preserves:

- schema/version ID;
- seed;
- selected player Goal/Reason option ID;
- exact canonical initial `RuntimeSnapshot` after setup/motivation selection;
- committed player ActionPackages for each resolved Beat.

`replayFromSpec` starts from that exact initial snapshot and deterministically regenerates NPC choices and semantic outputs. This allows fixtures to preserve expected results without relying on browser state or regenerating a possibly changed content assembly.

## Local snapshot convenience

The Debug browser surface stores/restores the canonical serialized RuntimeSnapshot directly. It does not define a second save-game schema. Save/restore does not resolve a Beat.

## Phase 9 conformance fixture

`src/living-comic/fixtures/phase9Acceptance.ts` is the canonical v0.1 end-to-end semantic fixture. It deterministically demonstrates private-content separation, attention diversion, Ask, Deal rejection, Deal acceptance/obligations, Direct movement, Pressure, false-belief weakening/revision, differing interpretations, grounded history promotion, semantic termination, and byte-equivalent replay.

The setup screen can load the same initial fixture state for manual play through the ordinary Action Builder and `End Beat & Observe` control.
