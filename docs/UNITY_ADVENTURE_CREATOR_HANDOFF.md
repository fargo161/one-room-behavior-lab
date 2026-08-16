# Living Comic Engine v0.1 — Unity / Adventure Creator Handoff

## Status

No Unity port or Adventure Creator bridge is implemented in v0.1. This document defines the semantic ownership boundary a future implementation must preserve.

The earlier `ADVENTURE_CREATOR_DESIGN_PATH.md` is retained as historical architecture context. This handoff is the current Living Comic v0.1 portability contract.

## What transfers

A future C# implementation should reproduce behavior from:

- TypeScript/Zod schema meanings;
- stable semantic IDs;
- repository-root content definitions and `content/manifest.json`;
- Narrative LEGO validation rules;
- Proposition/world-fact semantics;
- seeded deterministic algorithms;
- action/Function/Deal contracts;
- attention/perception/interpretation/belief timing;
- semantic invariants;
- Phase 6 and Phase 9 fixtures plus expected outputs;
- replay contracts.

The TypeScript runtime itself does not need to execute inside Unity.

## Unity / Adventure Creator should own

- scenes, rooms, panels, cameras, and visual staging;
- prefabs and art/audio assets;
- Adventure Creator Hotspots and interaction menus;
- dialogue/comic presentation;
- visual ActionLists and authored surrounding adventure flow;
- asset manifests/adapters that map visual resources to stable semantic IDs.

## The social simulation core should own

- canonical world truth;
- character Goals, Reasons, Obstacles, beliefs, and relationships;
- Narrative LEGO assembly/validation;
- Action/Function semantics;
- deterministic NPC selection;
- Deal/obligation state;
- Scene Pressure semantics;
- Observable Events, Perceptions, Interpretations, belief updates, and History;
- Beat commitment/resolution;
- termination;
- replay/conformance behavior.

## Bridge rule

The bridge translates between AC/Unity interaction identifiers and semantic IDs. It must not create a second source of truth.

Examples:

```text
AC Hotspot click
→ semantic entity/zone ID
→ legal semantic Action draft
→ core resolveBeat
→ structured result/events
→ AC visualizes result
```

An AC Conversation may present a realized semantic Message but must not replace the Message/Deal engine with branch-authored dialogue truth. An ActionList may animate a resolved change but must not silently override world state.

## Future modular character/panel track

The modular body, pose, garment, interaction-socket, Driver/Receiver, and panel-authoring architecture is compatible with this boundary as a future presentation/interaction layer. It is not part of the v0.1 browser acceptance gate and should not be allowed to move semantic authority out of the core.
