# v0.3 Test and Acceptance Matrix

## Automated suite

The v0.3 branch retains all 89 stabilized v0.2.1 tests and adds 41 focused v0.3 tests, for 130 Vitest assertions across two engine test files. A separate rendered-page smoke test brings the automated total to 131.

| Area | Automated evidence |
| --- | --- |
| Beat economy | 3 AP accepted; repeated families and two Moves accepted; fourth action rejected; invalidation spends AP |
| Direct messages | duplicate recipient rejected; Drew plus Mara accepted; overhearing does not consume a direct slot |
| Message identity | meaningful component changes identity; rendered wording does not control identity |
| Reception | direct, full, partial, noticed-only, and none/private are exercised |
| Attention | identical geometry produces different hearing when attention changes |
| Movement | connected graph, one-edge resolution, and repeated movement are exercised |
| Scan | observable evidence is returned without hidden counter dumps |
| Room events | seed reproduces the same event; an existing opening can be exploited without DISTRACT AP |
| Distraction | success/direct, success/covert, failure/covert, and failure/likely attribution are distinct |
| NPC agency | legal three-action plans; MOVE, MESSAGE, SCAN, and protective INTERACT; NPC-to-NPC reception |
| Planning fairness | NPC plans are invariant to the player's unseen queued plan |
| Mid-Beat collisions | player invalidates NPC; NPC invalidates player; whisper degradation; no AP refund |
| Fail trajectories | Drew lockdown, Mara flight, and accumulated-state-without-trigger non-fail cases |
| Determinism | same seed, state, and plans reproduce outcome and traces |
| Provenance | prior/new state, actor, action, rule, cause, and resolution state retained at mutation time |
| Causal history | ordinary history entries carry exact trace references |
| End-to-end acceptance | room event, independent movement, whisper degradation, partial overhear, Scan, Move, and Guard in one Beat |

## Required gates

Run from repository root:

```powershell
npx tsc --noEmit
npm run lint
npm test
npm run build
npm run test:rendered
```

## Player-view acceptance

- The primary view shows tableau, Beat/AP, queue, contextual builder, causal history, and Commit Beat.
- Function, BASED Vibe, emotion, hidden counters, and correctness labels are absent from ordinary input.
- Up to three actions can be added, removed, and reordered.
- The natural-language message is previewed before queueing.
- NPC plans are not exposed before resolution.
- Debug mode contains plan, resolution, reception, and provenance evidence without making it the normal play surface.
