# v0.3 Focused Repair Report

Status: **PROVISIONAL / PROTOTYPE-LOCAL**

Branch: `v0.3-focused-repair`

Source: `v0.3-prototype-rework` at `a64e453e3a6577c62de87756bcd7daaf762b046d`

This pass repairs the reviewed v0.3 proof in place. It does not merge the branch, modify `main`, alter tag `v0.2.1`, or change the PSG or canonical Social Interaction repositories.

## P0 closed: object-state integrity

- Centralized coherent envelope transitions.
- Held envelope follows holder movement.
- Possession and guarding are distinct; a different guard may contest a holder only while physically reachable.
- Enforceable guards block clean ordinary `TAKE`.
- Beat-scoped distraction/room-event openings can compromise enforcement.
- `SECURED` establishes stronger possession and blocks ordinary taking.
- `LOCKED_AWAY` clears holder and guard, hides the object, and places it in the cabinet.
- Runtime invariant auditing covers stale position, missing secure/held possession, and invalid guard relations.

## P1 closed: movement

- Replaced actor-named room nodes with physical nodes.
- Added location-targeted and actor-targeted Move identity.
- Narrowed `NATURAL_RETARGET` to the same actor identity with changed concrete position.
- Preserved one-edge movement, derived proximity, and observable course changes.
- Departed actor targets invalidate when the scenario remains active.

## P1 closed: distraction

- Attribution is stored per observing NPC.
- DIRECT, LIKELY, POSSIBLE, and NONE produce bounded vigilance differences.
- Successful distraction can create a guard opening independently from attribution.
- Attributable failure differs from hidden failure.
- An observer who sees enough can connect distraction and exploitation.
- Normal history reveals direct certainty only; exact beliefs remain in debug/provenance.

## P1 closed: message UX and validity

- Ordinary UI begins with recipient, core content, directness, and plausible delivery.
- Optional semantic additions are contextual rather than a permanent 12-field panel.
- Live natural-language preview remains downstream of structured identity.
- Scenario-authored compatibility data is shared by UI, plan validation, and resolution.
- Required, incompatible, unavailable, and risky support are distinct.
- Optional support loss degrades; essential support loss invalidates.
- No free-text parsing or semantic auto-rewrite was introduced.

## P2 closed: planner honesty

- Planner order is hard constraints, legal candidates, operative weights, deterministic selection.
- Weight changes alter rankings in controlled tests.
- Hard trajectory constraints remain mandatory.
- No mid-Beat strategic replanning was added.
- Debug rationale includes candidates, legality, goals, weights, selection, and hard constraints.

## P2 closed: room-event consequence

- All five families have distinct typed effect identities.
- Position change opens the door persistently.
- Reveal/access creates a real extended inspection affordance.
- Natural distraction compromises Drew's guard without player authorship.
- Occupation changes visible hand state and creates a Beat-scoped opening.
- Interruption changes attention/noise and exit salience.
- Temporary affordances expire deterministically and mutations are traced.

## P2 closed: player inference

- Normal actor cards no longer expose trajectory labels.
- Directly observable position, gaze, orientation, posture, hands, face, and possession remain explicit.
- Scan adds evidence without mind-reading.
- Debug retains complete hidden state and audit information.
- No player-facing numeric risk meter was introduced.

## P3 closed or bounded

- Packaging Evidence now contains only fields grounded in current controls and makes no hidden-state classification.
- `NATURAL_RETARGET` is narrowly scoped.
- Object identity does not grant free movement after object relocation.
- Intended reception respects impossible distance/noise while remaining robust to ordinary attention.
- Terminal creation has exact mutation-time provenance.
- Later committed actions receive `CANCELLED_BY_TERMINAL` records and retain AP commitment.
- `MISHEARD` and group messages remain explicitly deferred.

## Historical test changes

The original v0.3 tests were updated only where the focused repair intentionally replaced behavior:

- actor-relative anchor names became physical locations;
- one global distraction attribution assertion became per-observer assertions;
- legal NPC protection may use `INTERACT`, not only Move/Message/Scan;
- an incoherent warning attached to `ASK_INTENTIONS` became a lawful `WARN_ABOUT_EXIT` message;
- the end-to-end geometry was updated to create real post-movement distance.

No retained expectation was silently deleted or weakened to bypass a defect. One test exposed and led to a real fix: trajectory progression is now monotonic, preventing `LOCKDOWN` from regressing to `SECURING` before Drew's warning.

## Validation target

- Typecheck: pass
- Lint: pass
- Vitest: 164/164
- Production build: pass
- Rendered smoke: 1/1
- Manual acceptance: see `MANUAL_ACCEPTANCE_v0_3_FOCUSED_REPAIR.md`
