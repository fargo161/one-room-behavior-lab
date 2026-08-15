# Phase 4–6 portable engine contracts

These contracts define the semantic behavior a future Unity/C# engine must reproduce. Records are plain serialized data with stable snake-case IDs. No contract permits runtime AI or access to private state not listed in its input.

## Function routing

```text
routeIntention(intention[], content)
→ compatibleFunctionIds[]
→ candidateOperationIds[]
```

Routing happens before behavior creation. Functions are never attached after candidate selection. Current deterministic routing is proposition-based:

- exit/departure intentions → `ESCAPE`
- possession/control/access intentions → `ACCESS`
- exposure/visibility/open intentions → `SENSORY`
- focus/protection/exposure-of-actor intentions → `ATTENTION`
- ordinary non-exit movement → `ACCESS` and `ATTENTION`

The returned Direct Action definitions must independently declare at least one routed Function as compatible.

## SelectNpcAction

`buildActorDecisionView(preBeatSnapshot, actorId)` produces an `ActorDecisionView`. `selectNpcAction(view, content)` produces an `ActionPackage` and `NpcDecisionTrace`.

The decision view contains the actor's Goal, Reason, Obstacle, beliefs, obligations, relevant Deals, Scene Pressure, stable entity identities, and action-build context. It deliberately excludes world truth, other actors' private Goals/Reasons, the player draft, and other same-Beat action choices or results.

Candidate weights are:

```text
+100 primary Goal progress
 +40 active Obstacle relevance
 +25 secondary Goal preservation
 -25 secondary Goal violation
 +20 accepted Deal fulfillment
 -40 accepted Deal violation
 +15 urgent Scene Pressure response
 +10 causal Function fit
```

No Phase 6 fixture activates a secondary Goal, so its score is currently zero; the scorer still applies `+25` to a matching secondary target and `-25` to a conflicting target when one is present. Deal Responses additionally receive an explicit response-fit score derived from requested conflict and offered Goal benefit. Beliefs are a hard availability constraint. Ranking is total score descending, then semantic action ID ascending. The trace records every component and whether beliefs permitted the candidate.

## Shared action grammar

Player and NPC use the same `ActionDraft` union and factories: Direct Action; Social Action using Ask, Pressure, or Deal; Deal Response using Accept, Reject, or Counter; and Wait.

Every non-Wait action contains desired immediate Proposition changes and causally routed Function IDs. Message is a separate semantic record referenced by Social Action. Tactic is not inferred from wording.

`OFFER_OBJECT` asserts `OFFERED_TO` and `AVAILABLE_TO`; it changes neither `HELD_BY` nor `OWNED_BY`. A later recipient `TAKE` is the v0.1 explicit acceptance condition. Ownership has no implicit transfer path.

## Deal lifecycle

```text
PROPOSED → ACCEPTED → FULFILLED or BROKEN
PROPOSED → REJECTED
PROPOSED → SUPERSEDED + linked counter PROPOSED
```

Acceptance creates one `Obligation` per requested and offered term. Fulfillment reads actual world facts. Breach requires a successful result caused by the responsible actor that contradicts its term. Broken obligations and Deals remain history-eligible.

## ResolveBeat

Inputs are an immutable pre-Beat `RuntimeSnapshot`, one player `ActionPackage`, and validated portable content.

Ordering:

```text
1. Build both NPC decision views from the same pre-Beat snapshot
2. Select both NPC actions
3. Commit all three actions
4. Sort by priority and stable actor order
5. Resolve actions without replanning
6. Advance Scene Pressure once
7. Evaluate Goals and Deals
8. Process ordered event access and evolving Attention
9. Build Perceptions
10. Interpret NPC Perceptions
11. Update beliefs
12. Promote meaningful history
13. Evaluate termination
14. Emit post-Beat snapshot and BeatResolutionReport
```

Priorities are attention/focus change (1), movement/position (2), object/world manipulation (3), message-only social and Deal response (4), and exit/terminal movement (5). Equal priority uses scene `stableActorOrder`.

Each `CommittedAction` and both NPC decision traces reference the same pre-Beat state ID. A prerequisite valid at commitment but invalid after an earlier result produces `INVALIDATED`; a prerequisite already false at commitment produces `FAILED`. Both emit Observable Events.

## ProcessAttention and BuildPerceptions

Inputs are ordered Observable Events, semantic Messages, starting Attention states, and public entity topology. Perception never reads ActionDraft intentions.

Channels are `VISUAL`, `AUDITORY`, and `COMMUNICATION_CONTENT`. Attention changes are applied after the current event and before the next event. Ambient physical access may register only that an actor acted, while matching primary focus registers detailed result Propositions. A non-recipient can perceive communication occurrence without content. Private content is recipient-only.

## InterpretPerceptions

Inputs are a Perception, its public Observable Event, portable content, and an observer view containing only the observer's beliefs, Goal, relationships, history context, and Scene Pressure.

The function creates finite hypotheses, scores them, and selects one by score then stable candidate ID. It cannot accept or inspect the sender's true intention, Function, Goal, Reason, or ActionDraft. Inferred intention, Function, Goal, and certainty therefore remain hypotheses and can be false.

The player role does not receive authoritative machine interpretation.

## UpdateBeliefs

Interpretive evidence creates or weakens `UNCERTAIN` hypotheses. Directly perceived factual Propositions provide stronger evidence:

```text
matching evidence → CONFIRMED
contradiction to CERTAIN → WEAKENED to UNCERTAIN
contradiction to UNCERTAIN → REVISED to new CERTAIN belief
```

Every update preserves Perception and optional Interpretation provenance. Updated beliefs become inputs only on the next Beat.

## Hard distinctions

```text
Goal ≠ Reason
World Truth ≠ Belief
Action ≠ Result
Event ≠ Perception
Perception ≠ Interpretation
Tactic ≠ Message
Social Pressure ≠ Scene Pressure
True Function ≠ Inferred Function
True Goal ≠ Believed Goal
```

Narrative LEGO initializes the conflict but does not control its resolution. No actor reads another actor's private state, and no actor replans after same-Beat commitment.
