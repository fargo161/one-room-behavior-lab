# Migration: v0.2 to v0.2.1

## Defects addressed

- Generic accepted Drew exchanges no longer make envelope offers eligible. Exchanges store requested action; only accepted action-bearing Deals create commitments; transfer requires active `OFFER_TRANSFER` commitment.
- Message provenance now fingerprints every supported semantic field and DPA term.
- Post-hoc path-to-rule guessing was removed. Mutation sites record rules, explanations, and source IDs.
- Canonical BASED names and room aliases are separate; first-Cue dominance is protected; 62:38 is named prototype-local.
- Builder help and Designer View distinguish mechanical, metadata, conditional, and presentational fields.
- Player Functions expose `OPERATIONAL` or `PARTIAL` status. No reinterpretation was fabricated.
- Complete-transfer text is conditional on confirmed joint match.
- Stabilization regressions increase the unit suite from 69 to 89 focused and retained tests.

## Primary files changed

`src/core/types.ts`, `src/data/based.ts`, `src/data/functions.ts`, `src/data/messageGrammar.ts`, `src/data/behaviors.ts`, `src/data/performance.ts`, `src/simulation/engine.ts`, `src/simulation/engine.test.ts`, `app/BehaviorLab.tsx`, metadata/version files, and the documentation set.

## Intentional non-changes

The one-room scenario, explicit Beat clock, eight-Beat limit, two success routes, same-snapshot selection, bounded proposition inventory, DPA categories, eight mapped/twelve reserved Vibes, behavior libraries, and overall interface structure remain. No PSG integration, environment actions, free text, generalized subsystem, new content, or visual redesign was added.

## Compatibility

v0.2 replay payloads can be rebuilt from their semantic fields but message IDs intentionally change. Exchange/commitment diagnostic schemas add requested-action provenance. Trace rule/source output becomes more accurate and therefore differs from v0.2. The v0.2 source baseline is preserved separately.
