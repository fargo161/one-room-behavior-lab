# v0.3 Focused-Repair Prototype Assumptions

Status: **PROVISIONAL / PROTOTYPE-LOCAL**

The executable sources of truth are `src/v3/config.ts`, `src/v3/messages.ts`, and `src/v3/engine.ts`. These rules are scenario-local implementation experiments, not canonical social-interaction laws.

## Shared Beat

- Every active actor receives 3 AP per Beat.
- Every current normal action costs 1 AP.
- AP remains committed after degradation, invalidation, or cancellation by a terminal state.
- Plans resolve through three ordered action slots with rotating initiative.
- NPC plans are deterministic and created from the immutable Beat-start tableau without access to the player's queued plan.
- Invalidated NPC actions do not trigger strategic mid-Beat replanning.

## Physical room graph and relational movement

Permanent nodes are `CENTER`, `TABLE`, `DOOR`, `WINDOW`, and `CABINET`. They describe physical geometry only.

`MOVE` may target a node or an actor identity. One Move advances one graph edge. Actor proximity is derived from current positions. If the same actor target moves before resolution, the action follows the actor's new position and records `NATURAL_RETARGET`. If that actor leaves, the Move invalidates unless a terminal state has already cancelled all remaining commitments.

## Object control

- `holderId` records physical possession.
- `guardedBy` records active protection or contest and may coexist with a different holder only while the guard remains reachable.
- A held envelope follows its holder automatically.
- An enforceable guard blocks ordinary `TAKE`; a guard compromised for the current Beat may permit it.
- `SECURED` is stronger possession and blocks ordinary `TAKE`.
- `LOCKED_AWAY` moves the envelope to the cabinet, clears holder and guard, hides it, and removes ordinary access.
- Player, Mara, and Drew obey the same object physics. Drew alone has the scenario-specific cabinet `LOCK_AWAY` affordance.

## Message construction and compatibility

The ordinary builder begins with recipient, core content, directness, and currently plausible delivery. Optional semantic additions are contextual.

Compatibility rules are scenario-authored data shared by UI, plan validation, and resolution. Invalid combinations are blocked. Some core messages require support. Risky or weak support remains playable. World-dependent optional support can disappear mid-Beat and produce explicit `DEGRADED` resolution; essential loss produces `INVALIDATED`. The engine never silently substitutes a different semantic choice.

One message costs 1 AP regardless of valid optional components. No free-text semantic parser exists.

## Reception

- Whisper direct range requires co-location.
- Current geometry can degrade whisper to low voice or normal delivery.
- Direct address normally overcomes ordinary lack of gaze at conversational range.
- Distance and loud noise can still make intended reception impossible.
- Non-recipient reception uses deterministic full, partial, noticed-only, or none outcomes.
- Partial fragments remain authored rather than generated or stochastically parsed.

## Distraction and attribution

- Attention success, event visibility, player-action visibility, causal visibility, and attribution remain separate.
- A covert window rattle requires the player at `WINDOW` to succeed.
- Mara and Drew form independent `DIRECT`, `LIKELY`, `POSSIBLE`, or `NONE` attribution beliefs.
- Direct/likely attribution can change future vigilance and make a later observed exploit more consequential.
- Possible attribution increases vigilance without establishing authorship.
- Natural room-event distractions have no player authorship by default.

## NPC planner

Planning follows:

```text
Beat-start state
→ hard trajectory constraints
→ currently legal candidates
→ scenario-local weights
→ deterministic three-action plan
```

Weights are operative. Character differences use shared planner structure plus scenario-local state, priorities, thresholds, and candidate choices. Planner rationale is inspectable in debug mode. These goals are not canonical Functions.

## Room events

Five seeded families have distinct effects:

- interruption changes noise/attention and exit salience;
- position change persistently opens the door;
- occupation changes visible hand/attention state and creates a Beat-scoped opening;
- reveal/access creates a Beat-scoped extended inspection affordance;
- natural distraction compromises Drew's guard for the Beat without player attribution.

Temporary affordances expire deterministically and all event mutations receive provenance.

## Player inference and failure

Normal play exposes observable position, gaze, orientation, posture, hands, face, possession, room events, and directly knowable facts. It hides trajectory labels, counters, exact weak attribution beliefs, and planner scores. `SCAN` expands observable evidence but does not reveal hidden classifications.

Drew and Mara trajectories remain internal engine state for planning, tests, debug, and terminal logic. Progression is monotonic and hard failure is visibly telegraphed when feasible.

## Accounting

Terminal creation is traced at mutation time. Later committed actions are not executed; each receives an explicit `CANCELLED_BY_TERMINAL` resolution and retains historical AP commitment.

## Explicitly unresolved

- `MISHEARD` mechanics;
- group messages;
- full Textual Paralanguage;
- canonical four-Function mappings;
- BASED ratios and 50:50 behavior;
- universal expression or punctuation interpretation;
- production-generic NPC planning;
- runtime LLM planning or dialogue;
- stochastic planning;
- free-text semantic parsing;
- Design Mode and Scenario Builder.
