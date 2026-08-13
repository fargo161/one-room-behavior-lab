# Rework from v0.2.1 to v0.3.0

## Preserved

- The exact stabilized v0.2.1 source, documentation, 89-test suite, rendered-page smoke test, and production build remain recoverable at tag `v0.2.1`.
- Structured message identity remains mechanics-first and independent of generated wording.
- Deterministic resolution, bounded Beats, Mara, Drew, the room, the envelope, object state, NPC autonomy, and exact causal provenance remain foundational.
- Existing v0.2.1 modules remain in history and continue passing their regression suite while the active player interface uses only the v0.3 tactical module.

## Removed from ordinary player UX

- direct Function selection;
- direct BASED Vibe selection;
- emotion-label delivery selection;
- designer-first semantic panels;
- large hidden-state displays;
- mechanical correctness indicators.

These concepts were not promoted, redefined, or deleted from project history. They are simply no longer the active player input path.

## Replaced

- One-message-per-Beat composition became a three-action shared Beat plan.
- The semantic selector became a component-based message builder with a natural-language preview.
- A small character/object diagram became a discrete positional room tableau.
- after-the-Beat NPC selection became shared Beat-start planning followed by ordered action-slot resolution.
- numeric ordinary-play feedback became observable tableau changes and concise causal history.

## Added

- 3 AP per player, Mara, and Drew;
- repeatable action families;
- player `MOVE`, `MESSAGE`, `SCAN`, `INTERACT`, and `DISTRACT`;
- NPC `MOVE`, `MESSAGE`, `SCAN`, and `INTERACT`;
- per-recipient direct-message locking;
- actor-specific reception and overhearing;
- deterministic attention, whisper degradation, and room noise;
- discrete room movement and object affordances;
- distraction success, visibility, cause, and attribution as separate facts;
- seeded tactical room events;
- rotating initiative and mid-Beat revalidation;
- visible Drew lockdown and Mara flight trajectories;
- static expression, gaze, posture, hand, position, and object state;
- exact v0.3 mutation-time provenance and trace-backed causal history.

## Remains provisional

All concrete tuning in `src/v3/config.ts`, including AP count, initiative order, geometry, hearing, room events, priority weights, and fail thresholds, is scenario-local. `MISHEARD`, group messages, canonical Function mapping, final BASED ratios, final textual paralanguage, runtime LLM planning, and free-text semantic parsing remain unresolved or explicitly out of scope.

## Architecture boundary

This rework modifies only the executable prototype repository. It does not modify PSG core or the canonical Social Interaction Master, and it does not claim that prototype `FunctionalElementId` values are the canonical four Functions.

