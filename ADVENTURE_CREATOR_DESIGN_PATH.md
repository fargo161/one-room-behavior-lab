# Unity + Adventure Creator Design Path

Status: **DECIDED FUTURE DIRECTION / NOT YET IMPLEMENTED**

This document establishes the official designer-facing implementation path for One-Room Behavior Lab and future scenarios built from its social-simulation architecture. It defines an authority boundary and a staged direction; it is not a Unity implementation contract.

## Status vocabulary

- **CURRENT:** the tested React/TypeScript implementation at stable release `v0.3.1`.
- **DECIDED FUTURE DIRECTION:** Unity + Adventure Creator as the designer-facing implementation path.
- **FUTURE / NOT YET IMPLEMENTED:** the bridge, Unity components, scenario configuration tools, asset pipeline, and reusable scenario templates described below.

Future concepts in this document must not be read as existing repository features.

## 1. Decision summary

The official direction is:

```text
Unity
+ Adventure Creator
+ One-Room Behavior Lab Social Simulation Core
+ a narrow Bridge Layer
```

Unity and Adventure Creator will be the stage and orchestration layer. The Social Simulation Core will remain the authoritative source of truth. A narrow bridge will translate between authored/player-facing interactions and deterministic simulation inputs and results.

This direction does not replace the current engine, deprecate the current prototype, or authorize a Unity port in this pass.

## 2. Responsibility split

### Unity + Adventure Creator

The designer-facing layer is intended to own:

- rooms, panels, cameras, scene staging, and character or object prefabs;
- Hotspots, interaction menus, and ActionLists;
- dialogue, menus, player-facing UI, and conventional adventure-game presentation;
- animation, sprites, models, sound, and audiovisual feedback;
- visual state changes and scenario presentation;
- conventional save/load support where useful.

Adventure Creator ActionLists may invoke simulation inputs or present resolved outcomes. They must not grow into a duplicate social-simulation engine.

### Social Simulation Core

The core remains authoritative for:

- shared Beat resolution and AP accounting;
- deterministic NPC planning and fail trajectories;
- actor-relative movement, attention, direct reception, and overhearing;
- message construction identity and interpretation inputs;
- distraction, attribution, and observer-relative knowledge;
- object possession, guarding, securing, and other semantic object state;
- mutation-time provenance, causal history, and deterministic replay.

### Bridge Layer

The future bridge should:

- convert Unity or Adventure Creator player actions into simulation inputs;
- submit those inputs to the authoritative core;
- convert simulation resolution into presentation changes;
- expose only the data required for authored presentation;
- avoid creating or retaining a competing simulation state.

## 3. Authority boundary

> **Adventure Creator is the stage and orchestration layer. The Social Simulation Core remains the authoritative source of truth.**

Adventure Creator may display that Drew holds the envelope, Mara moved to the door, Drew overheard a message, or Mara changed expression. It should display those facts because the simulation core resolved them.

Adventure Creator must not independently decide:

- who holds an object;
- who heard or understood a message;
- what an NPC believes;
- whether a distraction succeeded;
- which fail trajectory advanced.

The intended information flow is:

```text
Designer / Player
      |
      v
Unity + Adventure Creator
      |
      v
Bridge Layer
      |
      v
Social Simulation Core
(authoritative state and resolution)
      |
      v
Bridge Layer
      |
      v
Adventure Creator Presentation
```

Avoiding dual authority is a non-negotiable architectural invariant.

## 4. Current prototype role

The React/TypeScript implementation at `v0.3.1` is the **stable executable reference implementation for the social-simulation semantics**. It is not a failed prototype or temporary throwaway.

Its continuing roles include:

- regression oracle;
- deterministic reference implementation;
- semantic test bed;
- behavior and provenance validator;
- reference for a later Unity bridge;
- proof that the core mechanics operate independently of a specific presentation layer.

Future integration work must preserve its tested semantic behavior unless a separately reviewed architecture decision explicitly changes that behavior.

## 5. Future Unity and Adventure Creator scene model

The future scene may eventually contain concepts such as:

```text
Unity Scene
|-- Room / Panel
|-- SocialPosition nodes
|-- SocialActor components
|-- SocialObject components
|-- Attention / Event sources
|-- Adventure Creator Hotspots
|-- Adventure Creator ActionLists
`-- SocialSimulationBridge
```

The names are provisional. They communicate responsibility, not frozen C# APIs or serialization formats.

Possible responsibilities include:

- `SocialActor`: map a Unity/Adventure Creator character prefab to a simulation actor identity or profile.
- `SocialPosition`: map scene anchors to simulation room positions.
- `SocialObject`: map visible or interactive props to simulation object identities.
- `SocialEventSource`: map authored environmental events to simulation event inputs.
- `SocialSimulationBridge`: submit actions, receive resolution, and update presentation.

This is a design direction, not an implementation contract.

## 6. Narrow bridge concept

The bridge should expose the smallest useful boundary between authoring/presentation and the core:

```text
Adventure Creator / Unity input
    MOVE
    MESSAGE
    SCAN
    INTERACT
    DISTRACT
    END_BEAT
        |
        v
SocialSimulationBridge
        |
        v
Simulation Core
        |
        v
Resolution result
    actor movement
    object state
    reception records
    observable expression
    room events
    terminal state
    causal history
        |
        v
SocialSimulationBridge
        |
        v
Adventure Creator / Unity presentation
```

This pass does not define a production API, C# class structure, transport, serialization format, or cross-runtime strategy. Those decisions require their own design and validation work.

## 7. Future designer workflow goal

The long-term goal is for a designer to be able to:

```text
place a room or panel
place character prefabs
assign actor profiles
place social-position anchors
place interactive objects
define object starting state
author room-event sources
select visual assets
configure scenario-local data
press Play
test the social simulation
```

Ordinary scenario construction should eventually avoid requiring edits to simulation code. This is a future design goal, not current functionality and not a commitment to a particular editor implementation.

## 8. Simulation identity and presentation assets

Simulation identity must remain independent from presentation assets.

For example, actor identity `MARA` and its simulation profile can remain stable while its visible representation is a placeholder, 2D sprite, pixel-art character, photographic cutout, or 3D model. The social engine must not depend on art style.

The same principle applies to rooms and props: a visual asset should eventually be replaceable without changing the semantic identity or rules it represents.

## 9. Relationship to canonical repositories

The existing hierarchy remains:

```text
Periodic Semantic Grammar
    upstream generic semantic architecture

Social Interaction System
    canonical social-interaction design authority

One-Room Behavior Lab
    bounded executable and reference prototype

Unity + Adventure Creator future implementation
    designer-facing path built around the same simulation concepts
```

One-Room Behavior Lab does not supersede [`fargo161/social-interaction-system`](https://github.com/fargo161/social-interaction-system) or [`fargo161/periodic-semantic-grammar`](https://github.com/fargo161/periodic-semantic-grammar). This direction-setting pass does not modify either canonical repository.

## 10. Non-goals for this pass

This pass does not:

- port or rewrite the codebase in Unity;
- add a Unity project, Unity assets, or Adventure Creator packages or source;
- add C# bridge code or freeze component names and serialization formats;
- replace the TypeScript tests or delete the React implementation;
- alter the simulation, Beat system, messages, NPC planning, object rules, or room events;
- redesign the current UI;
- implement Design Mode, a Scenario Builder, or a new asset pipeline;
- modify Periodic Semantic Grammar or the Social Interaction System repository.

## 11. Staged migration direction

These stages are planning boundaries, not tasks authorized by this document:

```text
STAGE 0 - CURRENT
Stable React/TypeScript reference core

STAGE 1 - FUTURE
Define portable engine-facing state, action, and resolution contracts

STAGE 2 - FUTURE
Create a minimal Unity SocialSimulationBridge

STAGE 3 - FUTURE
Connect one Adventure Creator room to core actions

STAGE 4 - FUTURE
Map actors, positions, objects, messages, and events

STAGE 5 - FUTURE
Add designer-facing scenario configuration

STAGE 6 - FUTURE
Support presentation swapping and reusable scenario templates
```

The next architecture-design task should be Stage 1: inventory the current core's state, action, and resolution surfaces and propose a portable contract without implementing Unity or changing simulation semantics.
