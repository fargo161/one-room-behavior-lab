# v0.3 Prototype-Local Assumptions

Status: **PROVISIONAL / PROTOTYPE-LOCAL**

The executable source of truth is `src/v3/config.ts`. This document makes those values reviewable without presenting them as canonical social-interaction law.

## Shared Beat

- Every active actor receives 3 AP per Beat.
- Every current active action costs 1 AP.
- AP is committed when queued and is not normally refunded after degradation or invalidation.
- Plans resolve through three action slots.
- Initiative rotates Player → Mara → Drew, Mara → Drew → Player, then Drew → Player → Mara.

## Room graph

The graph uses `CENTER`, `NEAR_MARA`, `NEAR_DREW`, `NEAR_TABLE`, `NEAR_ENVELOPE`, `NEAR_DOOR`, and `NEAR_WINDOW`. `MOVE` advances one graph edge; a farther target produces a traceable degraded/partial Move rather than teleportation.

## Reception

- A whisper requires co-location to remain at whisper delivery.
- Current distance can degrade a whisper to low voice or normal delivery.
- Low voice and normal speech have scenario-local full/partial/noticed ranges.
- Loud room events reduce hearing range by one graph step.
- Attention can raise an event from missed to noticed or from noticed to partially overheard.
- Partial fragments are deterministic scenario-authored fragments, not stochastic free-text parsing.

## Room events

Five deterministic event families are selected from seed and Beat: interruption, position change, occupation, reveal/access, and distraction. Each event changes noise, attention, access salience, or exit salience. The same seed reproduces the same sequence.

## Distraction and attribution

- A visible call succeeds and is directly attributable.
- A covert window rattle requires the player at `NEAR_WINDOW`.
- Whether the attempt succeeds and whether Drew or Mara saw the player attempt it are separate evaluations.

## NPC planner

The non-LLM planner uses scenario-local priorities: protect the envelope, preserve the exit, seek information, communicate concern, and approach or avoid. Both NPCs plan from an immutable Beat-start tableau and cannot see the player's queued choices.

## Fail trajectories

Drew progresses through `NORMAL`, `WATCHFUL`, `GUARDING`, `SECURING`, `LOCKDOWN`, and `EJECT`. Mara progresses through `ENGAGED`, `UNEASY`, `NEAR_EXIT`, `READY_TO_LEAVE`, and `FLEE`.

The counters that support these trajectories remain hidden from ordinary play. Hard failure requires both accumulated scenario state and a valid immediate trigger. The player sees gaze, posture, position, hand/object state, speech, and ordinary actions instead of numeric meters.

## Explicitly unresolved

- final initiative rule after playtesting;
- exact room topology and thresholds;
- `MISHEARD` mechanics;
- group-message slot consumption;
- richer partial-fragment selection;
- final packaging-evidence schema;
- canonical four-Function mappings;
- BASED ratio semantics and 50:50 behavior;
- universal expression or punctuation interpretation;
- production NPC planning and balance.

