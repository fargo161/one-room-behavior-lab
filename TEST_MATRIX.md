# v0.2.1 Test Matrix

`src/simulation/engine.test.ts` contains 89 tests. Existing structural coverage was retained; tests 70–89 are focused stabilization regressions.

## Behavioral tests

- 18–30: queue/Beat semantics and privacy-aware communication.
- 31–43: epistemic behavior, DPA distinctions, accepted/rejected Deals, Pressure resistance.
- 46–57: Function effects, opportunity and negotiated routes, same-snapshot and joint action.
- 70–81: unrelated/relevant Deal behavior, wording independence, diverted attention, inference provenance, BASED sensitivity, performance synchronization, observation-vs-take causality, exclusive joint possession.

## Invariant tests

- 17, 33, 55–59, 65–66, 68: stable identity, truth isolation, bilateral transfer, trace linkage, determinism, history, no ID branching.
- 72–74: complete-payload fingerprint distinctions/stability and surface wording isolation.
- 75–76: perception prerequisite and hidden-content nonleakage.
- 79–81: mutation-time rule/source accuracy and ownership invariants.
- 82–89: canonical/alias separation, left-Cue dominance, prototype ratio, reserved registry, Function status/reinterpretation, real conflict friction, no post-hoc trace mapper, replay provenance, true Wait.

## Schema and structure tests

- 01–17: grammar requirements, relationship validation, registry size, structured message construction.
- 44–45, 49–52, 64, 67, 69: Function/behavior registry, reachability, startup validation, removed surfaces, semantic references.

## Build and smoke tests

- `npx tsc --noEmit`
- `npm run lint`
- `npm test` — 89 Vitest tests
- `npm run build` — vinext production build
- `npm run test:rendered` — one server-rendered HTML smoke test
