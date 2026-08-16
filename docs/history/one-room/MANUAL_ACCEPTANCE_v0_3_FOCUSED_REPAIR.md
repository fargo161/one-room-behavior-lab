# v0.3 Focused-Repair Manual Acceptance

Status: **PROVISIONAL / PROTOTYPE-LOCAL**

Historical note: this walkthrough originated with the focused repair. The semantic-closure branch preserves it and adds the closure checks below; earlier focused-repair claims should be read alongside `SEMANTIC_CLOSURE_REPORT_v0_3.md`.

This walkthrough checks the repaired systems as a player-facing composition rather than as isolated data fields. Matching automated cases live in `src/v3/focused-repair.test.ts`.

## 1. Initial evidence and natural opportunity

Start seed `7`.

Expected ordinary view:

- Physical positions are named `CENTER`, `TABLE`, `DOOR`, `WINDOW`, or `CABINET`; no permanent `NEAR_MARA` or `NEAR_DREW` node appears.
- The phone buzz visibly pulls Drew's gaze away from the envelope.
- No text assigns player authorship to the natural event.
- Mara and Drew cards show observable evidence, not `WATCHFUL`, `GUARDING`, or other trajectory labels.

## 2. Actor-targeted movement

Open Move and choose Mara or Drew rather than a room anchor.

Expected:

- The queue describes `Move toward Mara` or `Move toward Drew`.
- The action still costs 1 AP.
- If the selected actor changes position first, movement follows the same actor identity by one edge and debug records `NATURAL_RETARGET`.
- If the target leaves while the scenario remains active, the action invalidates rather than inventing pursuit.

## 3. Contextual message construction

Open Message.

Expected always-visible controls:

1. Recipient
2. Core content
3. Directness
4. Plausible delivery

Expected optional behavior:

- Optional additions appear as contextual choices.
- Changing core content changes the relevant addition set.
- An unavailable option is disabled or explained.
- A risky but lawful option can still be selected and is identified as risky.
- `SHARE_AUTHORIZATION` cannot be queued without scenario-required evidence.
- The preview updates live.
- A complex valid message still costs 1 AP.
- No Function, BASED Vibe, emotion, or free-text semantic control appears.

## 4. Guard, distraction, and object control

Create or reach a tableau where Drew visibly guards the envelope at the table.

Expected:

- A clean `TAKE` against an attentive, enforceable guard invalidates and spends its committed AP.
- A successful distraction can create a Beat-scoped opening.
- A visible player-caused distraction is directly attributable to its target; weaker beliefs are not printed as ordinary hidden-state labels.
- Taking through a valid opening can leave `holderId = PLAYER` and `guardedBy = DREW` only while both remain co-located in an intentional contest.
- Moving while holding moves the envelope automatically and ends an unreachable guard relation.
- Securing blocks ordinary taking.
- Locking away clears holder/guard, hides the envelope, and places it in the cabinet.

## 5. Room-event consequence

Restart with selected seeds if needed:

- seed `4`: door position change;
- seed `1`: envelope reveal/access;
- seed `2` or `7`: natural phone distraction;
- seed `0`: light occupation;
- seed `3`: hallway interruption.

Expected:

- The open-door event changes persistent door state and makes open-door evidence available.
- The reveal event permits inspection from the explicitly extended range for that Beat.
- Beat-scoped opportunities expire after advancing.
- Natural distraction creates no player attribution belief.
- Debug trace identifies each event mutation and source event.

## 6. NPC planner audit

Commit a Beat and open debug after resolution.

Expected:

- Last plans include planner rationale for Mara and Drew.
- Rationale lists candidate action, goal, operative weight, legality, selection, and hard constraint when applicable.
- Plans contain exactly the actions selected at Beat start.
- An invalidated later action does not trigger a new strategic choice during the Beat.
- Normal view never exposes these scores before or after resolution.

## 7. Inference and terminal accounting

Use Scan on Drew or Mara during an escalated state.

Expected:

- Scan reports position, gaze, posture, hands, orientation, and face evidence.
- It does not reveal the internal trajectory name.

Then reach a terminal state with later actions already committed.

Expected debug evidence:

- Terminal state has exact source trace references.
- Every remaining committed action has `CANCELLED_BY_TERMINAL`.
- Cancelled actions did not execute.
- Their original AP commitment remains recorded.

## Acceptance result

Pass when the ordinary UI satisfies the evidence/inference requirements, debug satisfies the audit requirements, and the full validation stack passes. Do not merge as part of this walkthrough.

## 8. Semantic-closure additions

- After the player takes and moves with the envelope, the room map places it at the player's current anchor and labels the held state; it is not left on the table.
- Player `SECURE` appears only while the player physically holds the envelope. Player `LOCK_AWAY` never appears.
- Authorization evidence options disable semantically irrelevant values such as `OPEN_DOOR`; unsupported but coherent evidence is labeled risky.
- Debug resolutions distinguish planned and effective message IDs after degradation and TRACE records their lineage.
- Debug distraction output stores separate Mara/Drew visibility records; causal exploitation appears only for an observer who saw both stages.
- Mara vigilance changes later planner rationale and directs her first action toward watching the player.
- Light flicker creates an actual guard opening, its temporary hand pose disappears on expiry, and later persistent hand/object state remains intact.
