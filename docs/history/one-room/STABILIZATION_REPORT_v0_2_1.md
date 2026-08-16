# One Room Behavior Lab v0.2.1 Stabilization Report

## Outcome

v0.2.1 stabilizes the v0.2 behavioral model without expanding the scenario or integrating PSG. The implementation closes the accepted-Deal transfer loophole, makes message identity complete and behavior-independent, records causal provenance at mutation time, exposes builder-field integrity, audits player-facing Functions, corrects BASED naming/orientation, and prevents transfer-completion presentation before a matched joint action.

## Defects fixed

- An unrelated accepted Deal can no longer unlock transfer-specific discharge pressure, `OFFER_TRANSFER`, or transfer scoring. Transfer routes require an active commitment whose requested action is `OFFER_TRANSFER`.
- Message IDs now hash the normalized complete authored payload, including proposition and terms, while excluding behavior selection and generated surface wording.
- Every primitive state mutation is captured with its actual rule, explanation, and source references at mutation time. The former post-hoc `ruleForDiff` inference path is gone.
- Observation-driven changes retain the observation rule instead of inheriting a later selected behavior rule.
- Subject is explicitly semantic metadata with no hidden mechanics. Ask reason is explicitly wording-only. The designer view exposes the contribution and status of each builder field.
- Every player-facing Function is marked `OPERATIONAL`, `PARTIAL`, or `INACTIVE` with an honest operational note. Partial functions were not reinterpreted into broader mechanics.
- BASED mappings use the canonical names and scenario aliases from the stabilization specification. The first/left Cue is dominant, and the 62:38 split is named as a prototype-local default.
- Default transfer performance no longer presents release or completion. Completion wording appears only after the joint-action matcher confirms compatible reciprocal actions.

## Intentionally unchanged

- The bounded one-room scenario, eight-beat cap, cast, visible action set, and no-PSG boundary remain intact.
- Stable serialized scenario and entity schema versions remain `0.2`; the product/package/UI release is `0.2.1`. This avoids an unnecessary schema migration for unchanged stored shapes.
- Existing numeric thresholds and provisional social/behavior mappings remain prototype-local unless a listed defect required a correction.
- Player-facing Functions marked `PARTIAL` remain partial. Their limitations are disclosed rather than hidden by new behavior logic.
- No external deployment was performed.

## Code-review searches

Focused searches confirmed:

- no message identity branch depends on behavior selection;
- no post-hoc rule-inference helper remains in production source;
- no premature transfer-completion wording remains in default performance source;
- no PSG import or integration exists;
- accepted exchanges are consulted for transfer pressure only through the active, transfer-specific commitment path;
- BASED reception reads the first Cue as dominant and uses the named prototype-local default share.

The remaining `v0.2` strings are stable scenario/schema identifiers. Internal uses of suspicion are domain-model terms, not retired player-facing surface labels.

## Verification

Executed on the final implementation in Windows PowerShell:

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed |
| `npm test` | Passed: 89/89 tests in 1 test file |
| `npm run build` | Passed: all five vinext build stages |
| `npm run test:rendered` | Passed: 1/1 server-render smoke test |

The 89-test suite retains the original 69 tests and adds 20 stabilization regressions covering Deal relevance, message identity completeness and behavior independence, perception boundaries, provenance, Vibe-only differences, matched versus unmatched joint performance, TAKE/transfer separation, BASED orientation, Function classification, real compatibility friction, deterministic replay, and true Wait behavior.

Manual acceptance scenarios A-H are documented in `MANUAL_ACCEPTANCE_v0_2_1.md`. The detailed automated coverage inventory is in `TEST_MATRIX.md`.

## Known provisional elements

- BASED effect sizes and the 62:38 reception weighting are local prototype defaults, not general theory claims.
- Function compatibility/conflict values are bounded prototype mappings.
- Performance timing and facial parameters remain illustrative, non-clinical prototype values.
- Subject metadata is retained for semantic traceability but has no independent mechanical modifier in this build.
- Ask reason affects generated wording only.
