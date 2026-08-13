# v0.3 Semantic Closure Report

Status: **PROVISIONAL / PROTOTYPE-LOCAL**

Branch: `v0.3-semantic-closure`

Source: `v0.3-focused-repair` at `f1ca502c2b493bb528503a5a7299506a13a62245`

This bounded pass preserves the successful focused-repair architecture and closes the concrete post-repair audit findings. It does not redesign the prototype, merge a branch, create a pull request, or modify either canonical repository.

## Closure matrix

| # | Audit issue | Closure | Proving coverage |
| --- | --- | --- | --- |
| 1 | Guard-only `SECURE` transfers possession | Closed: only `holderId` may secure; guards must use explicit lawful transfer first | `semantic-closure.test.ts`: guard-only, holder, compromised-guard, invariant cases |
| 2 | Envelope always rendered on table | Closed: room component positions from `world.envelope.position`, labels holder, hides locked-away state | `dynamic-ui.test.tsx`: take, move, re-render, table-negative, lock-away |
| 3 | Category-only message compatibility | Closed: shared value/world/provenance evaluation distinguishes relevant, supported, risky unsupported, unavailable, incompatible, and required | authorization/open-door, signed-note observation, Drew observation, actual Mara content, exit evidence tests |
| 4 | Degraded payload retains stale ID | Closed: effective payload keeps its own fingerprint with planned/effective/degraded-from lineage in resolution and TRACE | stable/change fingerprint and mid-Beat degradation tests |
| 5 | Psychic exploit linkage | Closed: each observer must have an attributable prior belief and independently see the later TAKE | two-stage observer and missed-stage regressions |
| 6 | Mara vigilance decorative | Closed: vigilance deterministically makes player Scan the first priority, suppresses approach, and appears in rationale | calm/vigilant planner comparison |
| 7 | Player `SECURE` omitted | Closed: shared engine affordance source exposes holder-only `SECURE`; `LOCK_AWAY` remains Drew-specific | engine affordance plus dynamic UI render tests |
| 8 | Light-flicker affordance unused | Closed: authored flicker temporarily compromises Drew's guard and adds a transient observable overlay without player attribution | deterministic flicker mechanics test |
| 9 | `durationBeats` decorative | Closed: expiry is `event Beat + duration - 1`; one/two-Beat semantics are documented and traced | controlled duration-two progression test plus retained one-Beat tests |
| 10 | Transient expression remains stale | Closed: transient overlay expires independently of persistent hand state | overlay appearance/expiry and later interaction preservation test |
| 11 | Observer visibility collapsed globally | Closed: `visibilityByObserver` replaces global target-derived fields and TRACE carries observer context | divergent Mara/Drew visibility and no-global-field test |
| 12 | Exact regression gaps | Closed: 18 closure regressions and 3 dynamic UI tests target the audited paths | `semantic-closure.test.ts`, `dynamic-ui.test.tsx` |

## Dynamic UI approach

The existing React and `react-dom/server` stack is sufficient; no browser automation dependency was added. The component test renders `RoomTableau`, resolves a real TAKE + MOVE through the engine, re-renders the component, and asserts the envelope moved to the holder's current physical anchor. It also renders the interaction composer from different world states to prove player `SECURE` visibility and Drew-only `LOCK_AWAY`.

## CI

`.github/workflows/merge-readiness.yml` runs on v0.3 branch pushes and pull requests targeting `main`. It uses Node 22, `npm ci`, and the complete declared validation stack without secrets or external services.

## Historical integrity

`FOCUSED_REPAIR_REPORT_v0_3.md` remains historical and now points to this continuation. The earlier defects are not rewritten out of history.

## Deferred non-goals

`MISHEARD`, group messages, full Textual Paralanguage, canonical Function/BASED changes, production-generic or stochastic planning, runtime LLM behavior, free-text semantic parsing, Design Mode, and Scenario Builder remain deliberately out of scope.

## Merge-readiness status

Local validation result before branch handoff:

- Typecheck: pass
- Lint: pass
- Vitest: 185/185 across five files
- Focused semantic-closure regressions: 18/18
- Dynamic UI/component tests: 3/3
- Production build: pass
- Rendered HTML smoke: 1/1
- GitHub Actions YAML parse: pass

All closure gates are satisfied for branch handoff. Final branch state is **READY FOR FINAL READ-ONLY AUDIT**. This is not merge authorization.
