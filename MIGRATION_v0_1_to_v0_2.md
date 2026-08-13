# One Room Behavior Lab: v0.1 to v0.2 Migration

This note records the migration diagnosis made before v0.2 behavior changes and the completed verification afterward.

## Why v0.2 breaks compatibility

v0.1 proved that the room could support deterministic eligibility, scored autonomous behavior, belief/world divergence, mechanically distinct DPA structures, provisional BASED effects, a shared performance plan, and causal inspection. Its player inputs, however, were solution-shaped bundles. Several important routes also crossed causal layers through scenario-specific numeric shortcuts.

v0.2 keeps the proven simulation and inspection principles while replacing the input language and resolution semantics.

## Systems removed

- Eight prebuilt intervention cards and their player-facing card tray.
- Player-facing hallway buzzer and all buzzer state, rules, tutorial copy, and tests.
- `Wait / Observe` as a sibling intervention. Wait becomes an empty message queue resolved by End Beat.
- `BOTH` as a message recipient. Public visibility preserves direct address while allowing observation.
- Cosmetic seed state and New Seed UI unless a real stochastic choice is introduced.
- Card-ID conditions, including `ASK_MARA_WATCH` route preparation.
- Direct message-to-transfer authorization and Deal-to-obligation mutation.
- Objective proposition truth as an unobserved credibility modifier.
- Generic relevance derived from the number of intended function tags.
- Same-Beat Drew mutation before Mara behavior scoring.
- Active behaviors that cannot produce a real state/social effect and win in a deterministic fixture.

## Types replaced

| v0.1 | v0.2 |
|---|---|
| `InterventionCard` | `MessageDraft` plus validated `StructuredMessage` |
| `Intervention` card/event/wait union | `StructuredMessage | null` resolution input |
| message target including `BOTH` | direct `recipientId` plus `PRIVATE`/`PUBLIC` visibility |
| bundled surface line and mechanics | recipient, subject, DPA, function, visibility, delivery Vibe, proposition, and terms |
| immediate message consequences | communication event, perception, interpretation, belief/inference, functional application, and later behavior |
| numeric obligation from sent Deal | proposed exchange and accepted commitment records |
| direct transfer flag | transfer offer plus compatible acceptance/joint action |

## Architecture preserved

- Strict TypeScript and React application.
- Pure simulation independent from UI.
- Deterministic behavior eligibility, scoring, and stable tie-breaking.
- Objective world state separated from character beliefs.
- Mechanically distinct Ask, Deal, and Pressure.
- Structurally valid ordered BASED Vibes with explicitly provisional mappings.
- One shared `PerformancePlan` for action, face, gaze, and text.
- Player View and Designer View separation.
- State diffs, stable semantic IDs, source provenance, and causal trace.
- Local browser operation with no backend, runtime LLM, or external service.

## State semantics changed

- Queueing a message is UI/player-phase state and does not increment the Beat.
- `END BEAT & OBSERVE` is the only resolution control. A null queue is Wait.
- A communication event is objective and separate from its message content.
- Private content is restricted to the recipient; an attentive non-recipient may notice contact without accessing content.
- Observations, reports, inferences, assumptions, doubts, and refutations are distinct epistemic records.
- Player-selected Function is an intended application, not a guaranteed character pressure or direct metric award.
- Both characters select from the same pre-resolution snapshot. Newly visible consequences normally affect the next Beat.
- Transfer is a staged or same-snapshot compatible joint action, never a one-sided ownership mutation with an unrelated receiver performance.

## Tests replaced

v0.1 tests that assert buzzer behavior, card recipients, direct route preparation, intervention-ID replay, cosmetic seeds, or immediate transfer authorization are obsolete. v0.2 replaces them with Beat-state, builder, perception, epistemic, DPA comparison, function-identity, same-snapshot, joint-action, reception-profile, performance-rendering, reachability, removal, and build tests.

## Known compatibility breaks

- Saved intervention IDs and v0.1 replay sequences are intentionally unsupported.
- v0.1 Designer View records cannot be interpreted as v0.2 Beat records.
- The opportunity route takes multiple socially caused Beats instead of using a buzzer and same-Beat opportunity injection.
- The negotiated route requires an offer/acceptance lifecycle rather than immediate possession transfer.
- UI terminology changes from Target to Recipient.
- Versioned domain records move from `0.1` to `0.2` or `0.2-provisional`.

## Final verification

- Prebuilt card, buzzer, environment-event, separate Wait, BOTH-recipient, seed, immediate authorization, truth-status credibility, function-tag count, and same-Beat mutation paths were removed from `src` and `app`.
- The v0.1 engine and UI were replaced by the v0.2 structured message grammar, phase/queue session, perception/interpretation pipeline, belief and inference records, functional applications, explicit social records, same-snapshot selection, joint action, shared performance plans, and fifteen-panel Designer View.
- The replacement suite is enumerated in `TEST_MATRIX.md` and contains 69 tests, above the required minimum of 59.
- Final verification passed on 2026-08-13: `npx tsc --noEmit`; ESLint with zero findings; Vitest with 69/69 passing; five-stage `vinext build`; and the server-rendered HTML smoke test with 1/1 passing.
