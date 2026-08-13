# v0.3 Semantic-Closure Test and Acceptance Matrix

## Automated suite

The semantic-closure branch retains all stabilized, original v0.3, and focused-repair coverage. It adds 18 exact semantic-closure regressions in `src/v3/semantic-closure.test.ts` and 3 interaction-capable component/render tests in `src/v3/dynamic-ui.test.tsx`.

Current expected result:

- **185 Vitest tests** across five test files;
- **18 focused semantic-closure tests**;
- **3 dynamic UI/component tests**;
- **1 rendered-page smoke test**;
- **186 distinct automated checks total**.

| Area | Automated evidence |
| --- | --- |
| Beat economy | 3 AP accepted; repeated action families accepted; fourth action rejected; invalidation/cancellation retain commitment |
| Object invariants | held object follows holder; guard-only `SECURE` cannot steal possession; current holder can secure; compromised guard cannot bypass possession; invariant audit |
| Dynamic world rendering | take + holder Move re-renders envelope at holder location; table association is absent; locked-away envelope is hidden |
| Physical movement | physical-only nodes; one-edge movement; derived proximity; actor-targeted movement; natural retarget; departed target invalidation |
| Message limits | duplicate direct recipient rejected; overhearing does not consume direct allowance; one valid message remains 1 AP |
| Message identity | same payload/same ID; semantic change/new ID; planned/effective degradation lineage; wording remains downstream |
| Message compatibility | value-level support and relevance; signed-note, Drew-observation, and actual-Mara-statement provenance; exit evidence; risky vs incompatible |
| Delivery and reception | direct/full/partial/noticed/none; plausible delivery; impossible intended hearing; ordinary direct address remains robust |
| Distraction | observer-relative visibility/attribution; exploit requires seeing both stages; different observers can disagree; ordinary UI remains bounded |
| NPC planning | Mara and Drew vigilance are operative; hard constraints; legal candidates; weights; deterministic output; rationale |
| Room events | operative light flicker; `durationBeats` one/two-Beat semantics; deterministic expiry; transient expression overlay/removal; provenance |
| Player object affordance | player `SECURE` appears only for the holder; `LOCK_AWAY` remains Drew-specific; UI/engine rules share one source |
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
npm run test:ui
npm run build
npm run test:rendered
```

Every command must exit successfully before final read-only audit. `.github/workflows/merge-readiness.yml` runs the same gates on v0.3 branch pushes and pull requests targeting `main`.

## Player-view acceptance

- Normal mode shows physical tableau, AP/queue, four-control message core, contextual additions, live preview, observable causal history, and Commit Beat.
- Internal trajectories, counters, planner scores, exact weak attribution beliefs, Function, BASED Vibe, and emotion selectors are absent from ordinary play.
- Directly observable possession, position, gaze, posture, hands, and event clues remain explicit.
- Actor-targeted Move and contextual message options are understandable without debug mode.
- Debug exposes hidden state, candidate weights/rationale, plans, resolutions, compatibility, reception, attribution beliefs, and trace provenance.

See `MANUAL_ACCEPTANCE_v0_3_FOCUSED_REPAIR.md` for the human walkthrough.
