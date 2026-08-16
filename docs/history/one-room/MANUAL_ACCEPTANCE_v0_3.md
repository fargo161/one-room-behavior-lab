# v0.3 End-to-End Manual Acceptance

> Historical note: this walkthrough documents the pre-repair `v0.3-prototype-rework` behavior and preserves its reviewed acceptance case. The current focused-repair walkthrough is `MANUAL_ACCEPTANCE_v0_3_FOCUSED_REPAIR.md`.

This walkthrough is also encoded as an automated acceptance test in `src/v3/engine.test.ts`.

## Beat-start tableau

Seed: `7`

- Room event: **Phone buzz**.
- The buzz pulls Drew's attention away from the envelope and creates an exploitable communication opening.
- Player: `CENTER`.
- Mara: `NEAR_MARA`, attentive but angled toward the exit.
- Drew: `NEAR_DREW`, temporarily occupied by the room event.
- Envelope: available at `NEAR_ENVELOPE`.

## Plans chosen from the same tableau

Player:

1. `MOVE` toward Mara.
2. `MESSAGE` Mara in a whisper: ask for the envelope, with safety as the reason.
3. `SCAN` the envelope.

Mara:

1. `MOVE` toward the door.
2. `SCAN` Drew.

Drew:

1. `SCAN` Mara.
2. `MOVE` toward the envelope.
3. `INTERACT / GUARD` the envelope.

No plan sees another actor's queued choices. Beat 1 uses Player → Mara → Drew within each action slot.

## Ordered resolution

### Slot 1

1. Player moves from `CENTER` to `NEAR_MARA`.
2. Mara independently moves from `NEAR_MARA` to `NEAR_DOOR`.
3. Drew scans Mara and observes her at the exit.

### Slot 2

1. The player's queued whisper is revalidated. Mara moved after planning, so the actors are no longer co-located. Delivery degrades from `WHISPER` to `LOW_VOICE`; AP is not refunded.
2. Mara still receives the message directly.
3. Drew is now attending to Mara after his Scan. From his current position, he deterministically receives the partial fragment `...the envelope...`.
4. Mara scans Drew.
5. Drew moves from `NEAR_DREW` to `NEAR_ENVELOPE`.

### Slot 3

1. Player scans the envelope and receives observable object evidence rather than hidden values.
2. Drew uses ordinary `INTERACT / GUARD` to establish visible control of the envelope.

## Next tableau

- Mara is visibly near the door with exit-oriented posture.
- Drew is visibly near and guarding the envelope.
- The envelope is `GUARDED` by Drew.
- The causal history reports the movement, whisper degradation, partial fragment, Scan evidence, and object guarding in action order.
- Every consequential change has mutation-time provenance linking action, prior/new state, rule, cause, and resolution status.

## Result

**PASS** when the automated acceptance test and full validation stack succeed with the state and reception results above.
