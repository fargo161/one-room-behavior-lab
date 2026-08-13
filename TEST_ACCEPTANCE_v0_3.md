# v0.3 Focused-Repair Test and Acceptance Matrix

## Automated suite

The focused-repair branch retains the stabilized v0.2.1 regression coverage and the original v0.3 tests, then adds 34 behavior-level focused-repair tests in `src/v3/focused-repair.test.ts`.

Current expected result:

- **164 Vitest tests** across three test files;
- **1 rendered-page smoke test**;
- **165 automated checks total**.

| Area | Automated evidence |
| --- | --- |
| Beat economy | 3 AP accepted; repeated action families accepted; fourth action rejected; invalidation/cancellation retain commitment |
| Object invariants | held object follows holder; stale position prohibited; enforceable guard blocks; compromised guard opens access; secure/lock rules; actor symmetry |
| Physical movement | physical-only nodes; one-edge movement; derived proximity; actor-targeted movement; natural retarget; departed target invalidation |
| Message limits | duplicate direct recipient rejected; overhearing does not consume direct allowance; one valid message remains 1 AP |
| Message identity | structured identity controls mechanics; wording remains downstream |
| Message compatibility | contextual categories; required support; invalid vs risky; world availability; mid-Beat degrade/invalidate; traceability |
| Delivery and reception | direct/full/partial/noticed/none; plausible delivery; impossible intended hearing; ordinary direct address remains robust |
| Distraction | observer-relative attribution; progressive vigilance; attributable failure; observed exploit connection; natural events have no player authorship |
| NPC planning | hard constraints; legal candidates; operative weight changes; deterministic output; player-plan independence; rationale |
| Room events | all five effect identities; real position/reveal/distraction consequences; deterministic expiry and replay; provenance |
| Player inference | Scan returns observable channels without trajectory labels; normal history avoids weak hidden attribution labels |
| Packaging Evidence | grounded control evidence only; no emotion/BASED/Function/motive inference |
| Object retarget | same-object identity cannot grant free movement |
| Terminal accounting | exact terminal provenance; later actions explicitly cancelled; AP commitment retained |
| Determinism and provenance | same state/seed/plan reproduces outcome; mutation records retain prior/new state, rule, cause, and source |

## Required gates

Run from repository root:

```powershell
npx tsc --noEmit
npm run lint
npm test
npm run build
npm run test:rendered
```

Every command must exit successfully before merge review.

## Player-view acceptance

- Normal mode shows physical tableau, AP/queue, four-control message core, contextual additions, live preview, observable causal history, and Commit Beat.
- Internal trajectories, counters, planner scores, exact weak attribution beliefs, Function, BASED Vibe, and emotion selectors are absent from ordinary play.
- Directly observable possession, position, gaze, posture, hands, and event clues remain explicit.
- Actor-targeted Move and contextual message options are understandable without debug mode.
- Debug exposes hidden state, candidate weights/rationale, plans, resolutions, compatibility, reception, attribution beliefs, and trace provenance.

See `MANUAL_ACCEPTANCE_v0_3_FOCUSED_REPAIR.md` for the human walkthrough.
