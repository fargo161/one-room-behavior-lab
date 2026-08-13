# One-Room Behavior Lab

This repository contains the executable One-Room Behavior Lab prototype. Its current role is to test bounded social-interaction mechanics in a small, deterministic room.

The canonical social-interaction architecture lives in [`fargo161/social-interaction-system`](https://github.com/fargo161/social-interaction-system). The generic PSG parent grammar lives in [`fargo161/periodic-semantic-grammar`](https://github.com/fargo161/periodic-semantic-grammar).

This repository does not vendor, modify, or supersede either upstream project. Prototype mechanics are implementation experiments, not universal social-interaction laws.

## v0.3.0

v0.3 replaces the ordinary semantic-selector interface with a readable social-tactics loop:

```text
OBSERVE
→ PLAN THREE ACTIONS
→ COMMIT
→ ACTIONS COLLIDE
→ SEE CONSEQUENCE
→ REINTERPRET
```

The player reads a static room tableau and queues up to three 1-AP actions:

- `MOVE` through a discrete room graph;
- `MESSAGE` using constructed content and delivery choices;
- `SCAN` an actor, object, or the room for observable evidence;
- `INTERACT` with the envelope or exit;
- `DISTRACT` an NPC while success and attribution resolve separately.

Mara and Drew each receive three AP and share `MOVE`, `MESSAGE`, `SCAN`, and `INTERACT`. They plan independently from the same Beat-start tableau. Their actions resolve in three slots with rotating initiative, so queued actions can degrade or become invalid without a normal AP refund.

## Communication

Messages are built from scenario-authored components such as recipient, core content, reason, evidence, acknowledgment, promise, offer, qualification, condition, warning, directness, refusal space, and delivery mode.

Generated natural language is downstream of structured message identity. Packaging evidence is descriptive context; it is not an emotion, BASED Cue, Function, motive, or truth classifier.

An actor can directly address a recipient at most once per Beat. Actor-specific reception supports:

```text
DIRECT
OVERHEARD_FULL
OVERHEARD_PARTIAL
NOTICED_ONLY
NONE
```

Overhearing does not consume a direct-recipient allowance. Position, attention, delivery mode, and room noise determine whether private communication remains private or leaks.

## Cause and effect

The normal view presents observable action sequences instead of hidden-value deltas. Debug mode exposes exact actor plans, action-resolution states, reception records, and mutation-time traces.

Every consequential mutation records its Beat, actor, action, source event, prior and new state, rule, cause, resolution status, and relevant reception, visibility, or attribution context when the mutation occurs.

## Prototype-local boundary

The following values are centralized in [`src/v3/config.ts`](src/v3/config.ts) and labeled `PROVISIONAL / PROTOTYPE-LOCAL`:

- three AP per actor;
- initiative rotation;
- room anchors and graph edges;
- hearing and whisper thresholds;
- room-event selection;
- distraction positioning;
- NPC priority weights;
- fail-trajectory thresholds and effects.

See [`PROTOTYPE_ASSUMPTIONS_v0_3.md`](PROTOTYPE_ASSUMPTIONS_v0_3.md), [`REWORK_v0_2_1_to_v0_3.md`](REWORK_v0_2_1_to_v0_3.md), [`TEST_ACCEPTANCE_v0_3.md`](TEST_ACCEPTANCE_v0_3.md), and [`MANUAL_ACCEPTANCE_v0_3.md`](MANUAL_ACCEPTANCE_v0_3.md).

## Validation

```powershell
npx tsc --noEmit
npm run lint
npm test
npm run build
npm run test:rendered
```

The immutable stabilized baseline is preserved by the `v0.2.1` tag. v0.3 development remains on `v0.3-prototype-rework` until separately authorized for merge.

