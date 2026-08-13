# One-Room Behavior Lab

This repository contains a bounded, deterministic social-tactics prototype. It tests how observation, simultaneous planning, message construction, movement, attention, object control, and action collision produce legible consequences inside one room.

The canonical social-interaction architecture remains in [`fargo161/social-interaction-system`](https://github.com/fargo161/social-interaction-system), and the generic PSG parent grammar remains in [`fargo161/periodic-semantic-grammar`](https://github.com/fargo161/periodic-semantic-grammar). This prototype does not vendor, modify, or supersede either project.

## Current semantic-closure branch

`v0.3-semantic-closure` preserves the focused-repair architecture and closes the post-repair audit contradictions in place:

```text
OBSERVE
→ PLAN THREE ACTIONS
→ COMMIT
→ ACTIONS COLLIDE
→ SEE CONSEQUENCE
→ REINTERPRET
```

Every active actor receives three prototype-local AP. The player can queue `MOVE`, `MESSAGE`, `SCAN`, `INTERACT`, and `DISTRACT`; Mara and Drew use the same underlying action grammar except for explicit scenario affordances. Everyone plans from the same Beat-start tableau, and NPCs never inspect the player's queued plan.

## Focused repairs and semantic closure

- Envelope possession, guarding, securing, placement, and lock-away transitions enforce coherent invariants. `SECURE` is holder-only; guarding never transfers possession.
- The ordinary room map renders the envelope from `world.envelope.position` and labels its holder when held.
- Held objects follow their holders; guards remain only as reachable, intentional contest relations.
- Permanent room nodes are physical: `CENTER`, `TABLE`, `DOOR`, `WINDOW`, and `CABINET`.
- `MOVE` may target a physical location or an actor. If an actor moves first, the original target identity can resolve as `NATURAL_RETARGET` without strategic replanning.
- Distraction visibility and attribution are observer-relative. Exploitation is linked only for an observer who saw both the opening and the later object access; Mara and Drew both consume vigilance in deterministic planning.
- The ordinary message builder exposes only recipient, core content, directness, and plausible delivery before contextual additions.
- Scenario-authored compatibility data distinguishes value-level relevance, support, required support, current availability, incompatibility, and risky-but-playable unsupported claims from actual observation/message provenance.
- Planned and effective message identities remain distinct after degradation, with explicit lineage in resolution and TRACE.
- NPC priorities are operative in a deterministic legal-candidate ranking under hard trajectory constraints, with rationale available in debug mode.
- Every active room-event family has a real, deterministic, traceable world effect; authored `durationBeats` drives expiry and transient expression overlays expire without overwriting newer persistent state.
- Normal play exposes observable evidence rather than internal trajectory labels or counters.
- Terminal states receive mutation-time provenance, and every later committed action gets an explicit `CANCELLED_BY_TERMINAL` resolution while retaining its AP commitment.

## Communication

Structured message identity remains mechanically authoritative; generated wording is downstream. Contextual optional components can include reasons, evidence, acknowledgments, promises, offers, qualifications, conditions, warnings, or explicit refusal space when relevant.

One valid message costs one AP regardless of its number of components. Free-text semantic parsing is not implemented. Packaging Evidence describes only grounded controls such as directness, delivery, qualification, acknowledgment, refusal space, and explanation density; it does not infer emotion, BASED Cue/Vibe, Function, motive, or truth.

Actor-specific reception remains:

```text
DIRECT
OVERHEARD_FULL
OVERHEARD_PARTIAL
NOTICED_ONLY
NONE
```

Direct address strongly supports reception but does not override impossible audibility. Overhearing never consumes a direct-recipient allowance.

## Cause, evidence, and debug

Normal play presents physical positions, gaze, orientation, posture, hands, face, object state, room events, and observable causal history. `SCAN` returns richer evidence without revealing internal trajectory labels.

Debug mode exposes exact hidden actor state, planner candidates and weights, plans, action resolutions, message compatibility, reception, observer attribution beliefs, and mutation-time provenance.

## Prototype boundary

AP, initiative, topology, hearing thresholds, message compatibility, event definitions, planner weights, guard rules, and fail thresholds remain **PROVISIONAL / PROTOTYPE-LOCAL**. `MISHEARD`, group messages, canonical Function mapping, final BASED ratios, full Textual Paralanguage, runtime LLM planning, stochastic planning, free-text interpretation, Design Mode, and a Scenario Builder remain unresolved or out of scope.

See:

- [`PROTOTYPE_ASSUMPTIONS_v0_3.md`](PROTOTYPE_ASSUMPTIONS_v0_3.md)
- [`FOCUSED_REPAIR_REPORT_v0_3.md`](FOCUSED_REPAIR_REPORT_v0_3.md)
- [`SEMANTIC_CLOSURE_REPORT_v0_3.md`](SEMANTIC_CLOSURE_REPORT_v0_3.md)
- [`TEST_ACCEPTANCE_v0_3.md`](TEST_ACCEPTANCE_v0_3.md)
- [`MANUAL_ACCEPTANCE_v0_3_FOCUSED_REPAIR.md`](MANUAL_ACCEPTANCE_v0_3_FOCUSED_REPAIR.md)
- [`REWORK_v0_2_1_to_v0_3.md`](REWORK_v0_2_1_to_v0_3.md)

## Validation

```powershell
npx tsc --noEmit
npm run lint
npm test
npm run test:ui
npm run build
npm run test:rendered
```

The immutable stabilized baseline remains at tag `v0.2.1`. The pre-repair proof remains on `v0.3-prototype-rework`, and the audited focused repair remains on `v0.3-focused-repair`. Semantic closure remains isolated on `v0.3-semantic-closure` until a final read-only audit and separate integration authorization.
